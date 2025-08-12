import * as fs from 'node:fs';
import * as process from 'node:process';
import * as net from 'node:net';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import NestjsLoggerServiceAdapter from '../../logger/services/nestjs-logger.service';
import { loadConfig, globalConfigValidation, TracerType, AppConfig, ListenConfig } from '../types/configs';
import { ClassType } from '../types/common-types';
import { WeakDI } from './app-ref.service';

const APP_SHUTDOWN_INTERVAL = 10000; // 10 seconds

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
    setTimeout(() => process.exit(1), APP_SHUTDOWN_INTERVAL);
});

process.on('uncaughtException', err => {
    console.error('Uncaught Exception thrown', err);
    setTimeout(() => process.exit(1), APP_SHUTDOWN_INTERVAL);
});

export class MainService<T extends typeof AppConfig> {
    protected static instance: MainService<any>;
    protected application: NestExpressApplication;
    protected readonly config: InstanceType<T>;
    private logger: NestjsLoggerServiceAdapter;
    private server: net.Server;

    constructor(configClass: T) {
        this.config = globalConfigValidation(configClass, loadConfig());
    }

    public async start(appClass: ClassType) {
        await this.onBeforeNestInitialized();

        let httpsOptions = {};

        if (this.config.listen.https) {
            httpsOptions = {
                key: fs.readFileSync(this.config.listen.key_path),
                cert: fs.readFileSync(this.config.listen.cert_path),
                requestCert: false,
                rejectUnauthorized: false
            };
        }

        this.application = await NestFactory.create<NestExpressApplication>(appClass, {
            bufferLogs: true,
            // https://medium.com/better-programming/nestjs-the-good-the-bad-and-the-ugly-d51aea04f267
            abortOnError: false,
            httpsOptions,
        });

        WeakDI.setApp(this.application);

        this.logger = this.application.get(NestjsLoggerServiceAdapter);

        this.application.useLogger(this.logger);
        this.application.use((req, res, next) => {
            res.header('cache-control', 'no-cache');
            next();
        });
        this.application.set('trust proxy', 'loopback');

        await this.application.listen(this.config.listen.port, this.config.listen.hostname, () => {
            this.logger.verbose(`${this.config.listen.https ? 'HTTPS' : 'HTTP'} server started'`, 'main');
        });

        this.server = this.application.getHttpServer();

        await this.onAfterNestInitialized();
    }

    protected async onBeforeNestInitialized() {
        if (this.config.infrastructure.opentelemetry.enabled) {
            switch (this.config.infrastructure.opentelemetry.tracer) {
                case TracerType.AzureMonitor: {
                    const azureMonitor = await import('../../infrastructure/providers/azure-monitor');
                    await azureMonitor.default(this.config.infrastructure).start();
                    break;
                }
                default: {
                    const otelSDK = await import('../../infrastructure/providers/opentelemetry');
                    await otelSDK.default(this.config.infrastructure).start();
                    break;
                }
            }
        }
    }

    protected async onAfterNestInitialized() {
        // not implemented
    }
}