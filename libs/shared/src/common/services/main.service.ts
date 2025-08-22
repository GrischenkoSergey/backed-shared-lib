import * as fs from 'node:fs';
import * as process from 'node:process';
import * as net from 'node:net';
import { v4 as uuidv4 } from 'uuid';
import { NestFactory } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import NestjsLoggerServiceAdapter from '../../logger/services/nestjs-logger.service';
import { loadConfig, globalConfigValidation, TracerType, AppConfig } from '../types/configs';
import { ClassType, AppEvents, WorkerStartedEvent } from '../types';
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
    private readonly STARTUP_TIME: Date;
    private readonly uniqueId: string;
    private logger: NestjsLoggerServiceAdapter;
    private server: net.Server;

    constructor(configClass: T) {
        this.STARTUP_TIME = new Date();
        this.uniqueId = uuidv4().split('-')[4] + '-' + process.pid;
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

            this.application = await NestFactory.create<NestExpressApplication>(appClass, {
                bufferLogs: true,
                // https://medium.com/better-programming/nestjs-the-good-the-bad-and-the-ugly-d51aea04f267
                abortOnError: false,
                httpsOptions,
            });
        } else {
            this.application = await NestFactory.create<NestExpressApplication>(appClass, {
                bufferLogs: true,
                abortOnError: false
            });
        }

        this.application.enableCors({
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
        });

        WeakDI.setApp(this.application);

        const config = new DocumentBuilder()
            .setTitle(this.config.settings.product_name)
            .setDescription(this.config.settings.description)
            .setVersion('1.0')
            .build();
        const documentFactory = () => SwaggerModule.createDocument(this.application, config);

        SwaggerModule.setup('api', this.application, documentFactory);

        this.logger = this.application.get(NestjsLoggerServiceAdapter);

        this.application.useLogger(this.logger);
        this.application.use((req, res, next) => {
            res.header('cache-control', 'no-cache');
            next();
        });
        this.application.set('trust proxy', 'loopback');

        await this.onAfterNestInitialized();

        await this.application.listen(this.config.listen.port, this.config.listen.hostname, () => {
            this.logger.verbose(`${this.config.listen.https ? 'HTTPS' : 'HTTP'} server started'`, 'main');
        });

        this.server = this.application.getHttpServer();

        try {
            const events = this.application.get(EventEmitter2);
            events.emit(AppEvents.WorkerStarted, new WorkerStartedEvent(this.application, {
                type: 'bootstrap',
                startupTime: this.STARTUP_TIME.toString(),
                processId: process.pid,
                uniqueId: this.uniqueId,
                code: 0,
                signal: ""
            }));
        }
        catch (error) {
            this.logger.error(`Error during application startup! ${error.toString ? error.toString() : error.message}`, 'main');
        }
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