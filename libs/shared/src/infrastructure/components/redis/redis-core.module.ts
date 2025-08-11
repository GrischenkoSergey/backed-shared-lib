import { DynamicModule, Global, Module, Inject, OnModuleDestroy } from '@nestjs/common';
import { RedisModuleAsyncOptions, RedisModuleOptions, REDIS_MODULE_OPTIONS, REDIS_CLIENT } from './redis.common';
import { createAsyncClientOptions, createClient, RedisClient } from './redis-client.provider';
import { RedisService } from './redis.service';
import { RATELIMITER_MODULE_PARAMS_TOKEN, RateLimiterModuleParams } from './ratelimiter/params';
import { RateLimiterAsserterProvider } from './ratelimiter/asserter.svc';
import { RateLimiterGuardProvider } from './ratelimiter/guard';
import { getRequestIPAndPath } from '../../../common/helpers/core-utils';

@Global()
@Module({
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisCoreModule implements OnModuleDestroy {
    constructor(
        @Inject(REDIS_MODULE_OPTIONS)
        private readonly options: RedisModuleOptions | RedisModuleOptions[],
        @Inject(REDIS_CLIENT)
        private readonly redisClient: RedisClient,
    ) { }

    static register(
        options: RedisModuleOptions | RedisModuleOptions[],
    ): DynamicModule {
        return {
            module: RedisCoreModule,
            providers: [
                createClient(),
                {
                    provide: REDIS_MODULE_OPTIONS,
                    useValue: options
                },
                {
                    provide: RATELIMITER_MODULE_PARAMS_TOKEN,
                    useFactory: (redisClient: RedisService): RateLimiterModuleParams => {
                        // Default rate limiter parameters
                        return {
                            db: redisClient.getClient('ratelimiter'),
                            max: 10,
                            duration: 10000,
                            getId: getRequestIPAndPath
                            // createErrorBody: (limit: LimiterInfo) => ({
                            //     error: {
                            //         code: 'MY-RATE-LIMIT-ERROR-CODE',
                            //         params: limit,
                            //     },
                            // }),
                        };
                    },
                    inject: [RedisService]
                },
                RateLimiterGuardProvider,
                RateLimiterAsserterProvider,
            ],
            exports: [
                RedisService,
                RateLimiterAsserterProvider
            ],
        };
    }

    static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
        return {
            module: RedisCoreModule,
            imports: options.imports,
            providers: [
                createClient(),
                createAsyncClientOptions(options)
            ],
            exports: [RedisService],
        };
    }

    onModuleDestroy() {
        const closeConnection = ({ clients, defaultKey }) => (options) => {
            const name = options.name || defaultKey;
            const client = clients.get(name);

            if (client && !options.keepAlive) {
                client.disconnect();
            }
        };

        const closeClientConnection = closeConnection(this.redisClient);

        if (Array.isArray(this.options)) {
            this.options.forEach(closeClientConnection);
        } else {
            closeClientConnection(this.options);
        }
    }
}