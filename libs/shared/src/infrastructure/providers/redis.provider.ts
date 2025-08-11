import { ModuleRef, LazyModuleLoader } from "@nestjs/core";
import { Provider } from "@nestjs/common";
import { MODULE_OPTIONS_TOKEN } from '../infrastructure.module-definition';
import { InfrastructureFeatureOptions } from '../common/types';
import { DatabasesConfig, SettingsConfig } from '../../common/types/configs';
import { REDIS_SERVICE } from '../features';

export const REDIS_MODULE_REF = Symbol('REDIS_MODULE_REF');

export function RedisServiceProvider(): Provider[] {
    return [
        {
            provide: REDIS_MODULE_REF,
            useFactory: async (
                options: InfrastructureFeatureOptions,
                config: DatabasesConfig,
                settings: SettingsConfig,
                lazyModuleLoader: LazyModuleLoader
            ) => {
                if (config.redis.enabled) {
                    const { RedisCoreModule } = await import('../components/redis/redis-core.module');
                    const redisOptions = [
                        {
                            name: 'default',
                            host: config.redis.hostname,
                            port: config.redis.port,
                            db: config.redis.db,
                            username: config.redis.auth.username ?? undefined,
                            password: config.redis.auth.password ?? undefined,
                            keyPrefix: `${settings.solution_id}:`
                        },
                        {
                            name: 'ratelimiter',
                            host: config.redis.hostname,
                            port: config.redis.port,
                            db: config.redis.db,
                            username: config.redis.auth.username ?? undefined,
                            password: config.redis.auth.password ?? undefined,
                            keyPrefix: `${settings.solution_id}-${settings.project_id}-${settings.project_unique_id}:`
                        }
                    ]

                    return await lazyModuleLoader.load(() => RedisCoreModule.register(redisOptions));
                }
            },
            inject: [
                MODULE_OPTIONS_TOKEN,
                DatabasesConfig,
                SettingsConfig,
                LazyModuleLoader
            ]
        },
        {
            provide: REDIS_SERVICE,
            useFactory: async (redisModuleRef: ModuleRef) => {
                if (redisModuleRef) {
                    const { RedisService } = await import('../components/redis/redis.service');
                    return redisModuleRef.get(RedisService);
                }
            },
            inject: [REDIS_MODULE_REF]
        },
        // {
        //     provide: REDIS_SERVICE,
        //     useFactory: async (redisModuleRef: ModuleRef) => {
        //         if (redisModuleRef) {
        //             const { RedisService } = await import('../components/redis/redis.service');
        //             return redisModuleRef.get(RedisService);
        //         }
        //     },
        //     inject: [REDIS_SERVICE]
        // }
    ];
}
