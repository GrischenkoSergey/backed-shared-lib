import * as fs from 'node:fs';
import * as process from 'node:process';
import * as net from 'node:net';
import { NestFactory } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import NestjsLoggerServiceAdapter from '../../logger/services/nestjs-logger.service';
import { TracerType, AppConfig, InfrastructureConfig } from '../types/configs';
import { AppEvents, WorkerStartedEvent } from '../types/events';
import { ClassType, BootMessage } from '../types/common-types';
import { WeakDI } from './app-ref.service';

const APP_SHUTDOWN_INTERVAL = 10000; // 10 seconds
const cluster = require('cluster');

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
    setTimeout(() => process.exit(1), APP_SHUTDOWN_INTERVAL);
});

process.on('uncaughtException', err => {
    console.error('Uncaught Exception thrown', err);
    setTimeout(() => process.exit(1), APP_SHUTDOWN_INTERVAL);
});

const enable_perf_monitor = process.env.LISTEN__ENABLE_PERF_MONITOR === 'true';
const infrastructureConfig: InfrastructureConfig = process.env.INFRASTRUCTURE ? JSON.parse(process.env.INFRASTRUCTURE) : {};

export class ClusterService {
    protected static instance: ClusterService;
    private application: NestExpressApplication;
    private readonly config: AppConfig;
    private logger: NestjsLoggerServiceAdapter;
    private server: net.Server;
    private clusterStarted: boolean = false;
    private AppModuleClass: ClassType;
    private eventLoopPerf: () => number;

    public handleMasterMessages(message: any, connection: net.Socket) {
        if (message !== 'sticky-session:connection') {
            switch (message.type) {
                case 'bootstrap': {
                    if (!this.clusterStarted) {
                        this.clusterStarted = true;

                        this.bootstrap(message).then(() => {
                            if (enable_perf_monitor) {
                                this.eventLoopPerf = this.eventLoopLag(250);
                            }
                        });
                    }

                    return true;
                }
                case 'perf_measure': {
                    try {
                        cluster.worker.send({ type: "event_loop", id: cluster.worker.id, delay: this.eventLoopPerf() });
                    } catch {
                        // suppress all
                    }

                    return true;
                }
                case 'close': {
                    // not implemented
                    return true;
                }
                default: {
                    // not implemented
                }
            }

            return false;
        }

        if (this.server) {
            this.server.emit('connection', connection);
            connection.resume();
        } else {
            console.log('Application is starting.');
            connection.resetAndDestroy();
        }

        return true;
    }

    public get Config() {
        return this.config;
    }

    public async start(appClass: ClassType) {
        this.AppModuleClass = appClass;
    }

    public async bootstrap(bootMessage: BootMessage) {
        await this.onBeforeNestInitialized();

        const https = process.env['LISTEN__HTTPS'] === 'true';

        let httpsOptions = {};

        if (https) {
            httpsOptions = {
                key: fs.readFileSync(process.env['LISTEN__KEY_PATH']!),
                cert: fs.readFileSync(process.env['LISTEN__CERT_PATH']!),
                requestCert: false,
                rejectUnauthorized: false
            };
        }

        this.application = await NestFactory.create<NestExpressApplication>(this.AppModuleClass, {
            bufferLogs: true,
            // https://medium.com/better-programming/nestjs-the-good-the-bad-and-the-ugly-d51aea04f267
            abortOnError: false,
            httpsOptions
        });

        WeakDI.setApp(this.application);

        this.logger = this.application.get(NestjsLoggerServiceAdapter);

        this.application.useLogger(this.logger);
        this.application.use((req, res, next) => {
            res.header('cache-control', 'no-cache');
            next();
        });
        this.application.set('trust proxy', 'loopback');

        await this.application.listen(0, 'localhost', () => {
            this.logger.verbose(`${https ? 'HTTPS' : 'HTTP'} server started in worker with id='${process.pid}'`, 'main');
        });

        this.server = this.application.getHttpServer();

        this.logger.verbose(`Worker with id='${cluster.worker.id}' started`, 'main');

        try {
            const events = this.application.get(EventEmitter2);
            events.emit(AppEvents.WorkerStarted, new WorkerStartedEvent(this.application, bootMessage));
        }
        catch (error) {
            this.logger.error(`Error during application startup! ${error.toString ? error.toString() : error.message}`, 'main');
        }
    }

    protected async onBeforeNestInitialized() {
        if (infrastructureConfig.opentelemetry.enabled) {
            switch (infrastructureConfig.opentelemetry.tracer) {
                case TracerType.AzureMonitor: {
                    const azureMonitor = await import('../../infrastructure/providers/azure-monitor');
                    await azureMonitor.default(infrastructureConfig).start();
                    break;
                }
                default: {
                    const otelSDK = await import('../../infrastructure/providers/opentelemetry');
                    await otelSDK.default(infrastructureConfig).start();
                    break;
                }
            }
        }
    }

    private loopBlockedTime(fn: (ms: number) => void, options: { interval?: number, threshold?: number }) {
        let opts = options || {};
        let start = process.hrtime();
        let interval = opts.interval || 100;
        let threshold = opts.threshold || 10;

        return setInterval(() => {
            let delta = process.hrtime(start);
            let nanosec = delta[0] * 1e9 + delta[1];
            let ms = nanosec / 1e6;
            let n = ms - interval;

            if (n > threshold) {
                fn(Math.round(n));
            }

            start = process.hrtime();
        }, interval).unref();
    };

    private randomNumber(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);

        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private eventLoopLag(ms: number) {
        let start = time();
        let delay = 0;
        let timeout = setTimeout(check, ms);

        timeout.unref();

        function time() {
            let t = process.hrtime();
            return (t[0] * 1e3) + (t[1] / 1e6);
        }

        function check() {
            clearTimeout(timeout);

            let t = time();

            delay = Math.max(0, t - start - ms);
            start = t;

            timeout = setTimeout(check, ms)
            timeout.unref();
        }

        return (): number => {
            return Math.floor(delay);
        }
    }
}