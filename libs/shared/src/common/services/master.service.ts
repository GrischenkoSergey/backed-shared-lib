import * as fs from 'node:fs';
import * as process from 'node:process';
import * as net from 'node:net';
import * as farmhash from 'farmhash';
import * as express from 'express';
import * as http from 'http';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import { loadConfig, globalConfigValidation, AppConfig, ExporterType } from '../types/configs';
import { loadTransports } from '../../logger/adapters/winston/transports/transports.js';
import MasterLogger from '../../logger/adapters/winston/master.logger';
import { BackendError } from '../errors';

const APP_DIR_PATH = '../../../../../../apps';
const APP_SHUTDOWN_INTERVAL = 30000;    // 10 seconds
const PERF_MONITOR_INTERVAL = 1000;     // 5 seconds

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', err => {
    console.error('Uncaught Exception thrown', err);
});

const cluster = require('cluster');
const availableCPUCount = require('os').cpus().length;

cluster.setupMaster({ exec: join(__dirname, APP_DIR_PATH, process.env.PROJECT_ID ?? '', 'src/main.js') });

type WorkerInfo = {
    worker: any,
    code: number,
    signal: string,
    closing: boolean,
    eventLoopDelay: number,
    fnPerfMon: (() => number) | null,
}

export default class MasterService {
    protected static instance: MasterService;
    private readonly STARTUP_TIME: Date;
    private readonly uniqueId: string;
    private readonly activeWorkers: WorkerInfo[] = [];
    private readonly config: AppConfig;
    private readonly nodeInstanceCount: number;
    private readonly workerCount: number;
    private metricsServer;
    private promAppRouter;
    private promApp: express.Application;
    private logger: MasterLogger;
    private server: net.Server;
    private workerIndex = -1;
    private eventLoopPerf: () => number;

    constructor() {
        this.STARTUP_TIME = new Date();
        this.uniqueId = uuidv4().split('-')[4] + '-' + process.pid;
        this.config = globalConfigValidation(loadConfig());
        this.nodeInstanceCount = availableCPUCount;

        if (this.config.settings.worker_count > 0 && this.config.settings.worker_count < this.nodeInstanceCount) {
            this.nodeInstanceCount = this.config.settings.worker_count;
        }

        this.workerCount = parseInt(process.env.WORKER_COUNT!, 10) || this.nodeInstanceCount;
    }

    public handleWorkerMessages(worker, message, handle) {
        let handled = false;

        switch (message?.type) {
            case 'event_loop': {
                handled = true;

                try {
                    if (worker?.isConnected) {
                        const workerIndex = this.activeWorkers.findIndex(w => w.worker.id === worker.id);

                        if (workerIndex >= 0) {
                            this.activeWorkers[workerIndex].eventLoopDelay = message.delay;
                        }
                    }
                } catch {
                    // suppress all
                }

                break;
            }
        }

        return handled;
    }

    public async start() {
        this.logger = new MasterLogger(await loadTransports(this.config.infrastructure, this.config.storage));
        this.server = net.createServer({ pauseOnConnect: true }, (connection: net.Socket) => this.handleNetServerConnection(connection));

        this.server.on('error', (err: Error) => {
            this.logger.error('Connection failed', { error: err, app: this.config.settings.product_name, context: 'master' });
        });

        this.server.listen(this.config.listen.port, () => {
            this.logger.info(`Server listening on port ${this.config.listen.port}`, {
                app: this.config.settings.product_name,
                context: 'master',
                props: { hostname: this.config.listen.hostname, port: this.config.listen.port }
            });

            this.eventLoopPerf = this.eventLoopMonitor(PERF_MONITOR_INTERVAL);
        });

        if (
            this.config.infrastructure.opentelemetry.enabled &&
            this.config.infrastructure.opentelemetry.node_sdk.metrics.prometheus.enabled &&
            this.config.infrastructure.opentelemetry.node_sdk.metrics.exporter === ExporterType.Prometheus
        ) {
            const otelAggregator = await import('../../infrastructure/providers/opentelemetry-aggregator');
            const aggregator = otelAggregator.default();

            await aggregator.start();

            this.promApp = express();
            this.promAppRouter = express.Router();

            this.promAppRouter.use('/metrics', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                await aggregator.clusterMetrics()
                    .then(metrics => {
                        res.set('Content-Type', 'text/plain');
                        res.send(metrics);
                    }).catch(err => {
                        this.logger.error('Prometheus error (master)', { error: err, app: this.config.settings.product_name, context: 'master' });
                    });
            });

            this.promAppRouter.use("/{*path}", (req: express.Request, res: express.Response, next: express.NextFunction) => {
                this.logger.error('Bad request (master)', { error: new BadRequestException(), app: this.config.settings.product_name, context: 'master' });
                BackendError.BadRequest(res);
            });

            this.promApp.use('/', this.promAppRouter);

            this.metricsServer = http.createServer(this.promApp);

            this.metricsServer.listen(this.config.infrastructure.opentelemetry.node_sdk.metrics.prometheus.port, this.config.listen.hostname, () => {
                this.logger.info('Metrtics server listening (master)', {
                    app: this.config.settings.product_name,
                    context: 'master',
                    props: { hostname: this.config.listen.hostname, port: this.config.infrastructure.opentelemetry.node_sdk.metrics.prometheus.port }
                });
            });
        }

        this.initWorkers(this.workerCount)
            .then(() => {
                this.logger.info('Master instance started', {
                    app: this.config.settings.product_name,
                    context: 'master',
                    props: { workerCount: this.workerCount }
                });
            })
            .catch(err => {
                console.error('Unexpected Exception thrown', err);
                setTimeout(() => process.exit(1), APP_SHUTDOWN_INTERVAL);
            })
    }

    public handleOnlineWorker(worker: any) {
        const plist: number[] = [];
        const workersIds = Object.keys(cluster.workers).map(id => parseInt(id, 10));

        workersIds.forEach(id => {
            const w = cluster.workers[id];
            if (w.isConnected) {
                plist.push(w.process.pid);
            }
        });

        workersIds.forEach(id => {
            const w = cluster.workers[id];
            if (w.isConnected) {
                try {
                    const workerInfo = this.activeWorkers.find(w => w.worker.id === id);

                    cluster.workers[id].send({
                        type: 'bootstrap',
                        plist,
                        startupTime: this.STARTUP_TIME,
                        processId: process.pid,
                        code: workerInfo?.code,
                        signal: workerInfo?.signal,
                        uniqueId: this.uniqueId
                    });
                } catch (err) {
                    this.logger.info('Failed to send message to the worker process', {
                        error: err,
                        app: this.config.settings.product_name,
                        context: 'master',
                        props: {
                            targetWorkerId: id,
                            sourceWorkerId: worker.id
                        }
                    });
                }
            }
        });
    }

    private handleNetServerConnection(connection: net.Socket) {
        const remoteAddress = connection ? connection.remoteAddress : '0.0.0.0';

        if (this.eventLoopPerf() >= 0) {
            this.workerIndex = this.activeWorkers.findIndex(w => w.worker.id === this.eventLoopPerf());
        } else if (this.config.listen.enable_round_robin) {
            this.workerIndex = (this.workerIndex + 1) % this.workerCount;
        } else {
            this.workerIndex = this.worker_index(remoteAddress, this.workerCount);
        }

        if (this.workerIndex < this.activeWorkers.length) {
            let worker = this.activeWorkers[this.workerIndex].worker;

            if (worker && !worker.closing) {
                try {
                    worker.send('sticky-session:connection', connection);
                } catch (err) {
                    this.logger.error('Failed to proxy request to worker', { error: err, app: this.config.settings.product_name, context: 'master', props: { workerId: worker.id } });
                }
            } else {
                this.workerIndex = this.activeWorkers.length;

                let sent = false;

                while (--this.workerIndex >= 0) {
                    if (!(this.activeWorkers[this.workerIndex].worker !== null && !this.activeWorkers[this.workerIndex].closing)) {
                        continue;
                    }

                    try {
                        worker.send('sticky-session:connection', connection);
                        sent = true;

                        break;
                    } catch (err) {
                        this.logger.error('Failed to proxy request to worker', { error: err, app: this.config.settings.product_name, context: 'master', props: { workerId: worker.id } });
                    }
                }

                if (!sent) {
                    connection.destroy(new Error('No available workers.'));
                }
            }
        } else {
            const content = JSON.stringify({
                state: `Worker with index '${this.workerIndex}' is not available.`,
            });

            connection.write([
                'HTTP/1.1 200 OK',
                'Date: Sun, 29 Apr 2024 12:00:00 GMT',
                'Server: Apache/2.4.1',
                'Content-Type: application/json; charset=UTF-8',
                `Content-Length: ${content.length}`,
                'Connection: close',
                '',
                content
            ].join('\r\n'));

            connection.pipe(connection).end();
        }
    }

    private worker_index(ip, len) {
        return farmhash.fingerprint32(ip) % len;
    };

    private numWorkers() {
        return Object.keys(cluster.workers).length;
    }

    private async initWorkers(maxWorkerCount: number) {
        for (let i = this.numWorkers(); i < maxWorkerCount; i++) {
            this.spawn(i);
        }
    }

    private spawn(i: number, code?: number, signal?: string) {
        this.activeWorkers[i] = {
            worker: cluster.fork({
                LISTEN__HTTPS: this.config.listen.https,
                LISTEN__CERT_PATH: this.config.listen.cert_path,
                LISTEN__KEY_PATH: this.config.listen.key_path,
                LISTEN__ENABLE_PERF_MONITOR: this.config.listen.enable_perf_monitor,
                INFRASTRUCTURE: JSON.stringify(this.config.infrastructure),
            }),
            code: code!,
            signal: signal!,
            closing: false,
            eventLoopDelay: -1,
            fnPerfMon: this.config.listen.enable_perf_monitor ? this.workerMonitor(i, PERF_MONITOR_INTERVAL) : null
        };

        this.activeWorkers[i].worker.on('exit', (code, signal) => {
            if (code !== 0 && code !== 3221225786) {
                this.logger.info('Respawning worker', { app: this.config.settings.product_name, context: 'master', props: { index: i, code, signal } });

                this.spawn(i, code, signal);
            } else if (this.activeWorkers[i].closing) {
                this.logger.info('Close worker', { app: this.config.settings.product_name, context: 'master', props: { index: i, code, signal } });

                this.activeWorkers[i].worker = null;

                const activeWorker = this.activeWorkers.find(e => e.worker !== null);

                if (!activeWorker) {
                    this.initWorkers(this.workerCount);
                }
            }
        });
    }

    private workerMonitor(wIndex: number, ms: number) {
        let delay = 0;
        let start = Date.now();
        let workerIndex = wIndex;
        let timeout = setTimeout(() => check(this.activeWorkers[workerIndex]), ms);

        timeout.unref();

        function check(workerInfo: WorkerInfo) {
            clearTimeout(timeout);

            if (workerInfo?.closing || !workerInfo?.worker?.isConnected) {
                return;
            }

            try {
                let t = Date.now();

                if (workerInfo.eventLoopDelay > -1) {
                    delay = workerInfo.eventLoopDelay;
                    start = t;
                } else {
                    delay = Math.max(0, t - start);
                }

                workerInfo.worker.send({ type: 'perf_measure' });
                workerInfo.eventLoopDelay = -1;
            } catch {
                // suppress all
            }

            timeout = setTimeout(() => check(workerInfo), ms)
            timeout.unref();
        }

        return (): number => {
            return delay;
        }
    }

    private eventLoopMonitor(ms: number) {
        let nextWorkerId = -1;

        const check = () => {
            clearTimeout(timeout);

            let fasterWorkerId = -1;
            let fasterWorkerDelay = -1;
            let workerIndex = this.activeWorkers.length;

            while (--workerIndex >= 0) {
                const workerInfo = this.activeWorkers[workerIndex];

                if (!workerInfo.fnPerfMon || !workerInfo.worker || !workerInfo.worker.isConnected || workerInfo.worker.closing) {
                    continue;
                }

                const loopDelay = workerInfo.fnPerfMon();

                if (loopDelay < fasterWorkerDelay || fasterWorkerDelay == -1) {
                    fasterWorkerDelay = loopDelay;
                    fasterWorkerId = workerInfo.worker.id;
                }
            }

            nextWorkerId = fasterWorkerId;

            timeout = setTimeout(check, ms)
            timeout.unref();
        }

        let timeout = setTimeout(check, ms);

        timeout.unref();

        return (): number => {
            return nextWorkerId;
        }
    }

    private sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), ms);
        });
    }
}