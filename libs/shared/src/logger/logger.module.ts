import * as morgan from 'morgan';
import * as anonymise from 'ip-anonymize';
import TransportStream from 'winston-transport';
import { Global, Inject, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import WinstonLogger, { WinstonLoggerTransportsKey } from './adapters/winston/winston.logger';
import Logger, { LoggerBaseKey, LoggerKey } from './common/interfaces';
import NestjsLoggerServiceAdapter from './services/nestjs-logger.service';
import LoggerService from './services/logger.service';
import { InfrastructureConfig, StorageConfig, SettingsConfig } from '../common/types/configs';
import { ConfigModule } from '../config';
import { loadTransports } from './adapters/winston/transports/transports.js';

@Global()
@Module({
    imports: [
        ConfigModule.forFeature([
            InfrastructureConfig,
            StorageConfig,
            SettingsConfig
        ]),
    ],
    controllers: [],
    providers: [
        {
            provide: LoggerBaseKey,
            useClass: WinstonLogger,
        },
        {
            provide: LoggerKey,
            useClass: LoggerService,
        },
        {
            provide: NestjsLoggerServiceAdapter,
            useFactory: (logger: Logger) => {
                return new NestjsLoggerServiceAdapter(logger);
            },
            inject: [LoggerKey],
        },
        {
            provide: WinstonLoggerTransportsKey,
            useFactory: (log: InfrastructureConfig, storage: StorageConfig): Promise<TransportStream[]> => {
                return loadTransports(log, storage);
            },
            inject: [InfrastructureConfig, StorageConfig],
        },
    ],
    exports: [
        LoggerKey,
        NestjsLoggerServiceAdapter
    ],
})
export class LoggerModule implements NestModule, OnModuleInit {
    public constructor(
        @Inject(LoggerKey) private readonly logger: Logger,
        @Inject(SettingsConfig) private readonly settings: SettingsConfig,
    ) {
    }

    public onModuleInit() {
        morgan.token('req-headers', (req, res) => {
            if (req.headers) {
                return JSON.stringify(req.headers);
            }

            return 'empty';
        });
        morgan.token('res-headers', (req, res) => {
            if (res._headers) {
                return JSON.stringify(res._headers);
            }

            return 'empty';
        });
        morgan.token('remote-addr', req =>
            req.get('DNT') === '1'
                ? anonymise(
                    req.ip ||
                    (req.connection?.remoteAddress),
                    16, // bitmask for IPv4
                    16 // bitmask for IPv6
                )
                : req.ip);

        morgan.token(
            'user-agent',
            req =>
                req.get('DNT') === '1'
                    ? 'DNT'
                    : req.get('user-agent')
        );
    }

    public configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                morgan(
                    (tokens, req, res) => {
                        const result = {
                            method: tokens.method(req, res),
                            url: tokens.url(req, res),
                            status: tokens.status(req, res),
                            sessionId: (req.session ? req.session.id : null) || req.sessionID,
                            contentLength: tokens.res(req, res, 'content-length'),
                            responseTime: tokens['response-time'](req, res),
                            ipAddress: tokens['remote-addr'](req),
                            referrer: tokens.referrer(req)
                        };

                        return JSON.stringify(result);
                    },
                    {
                        stream: {
                            write: (requestData: string) => {
                                this.logger.debug("HTTP Request", { sourceClass: 'RequestMiddleware', props: JSON.parse(requestData) });
                            },
                        },
                    }
                ),
            )
            .forRoutes('*');
    }
}
