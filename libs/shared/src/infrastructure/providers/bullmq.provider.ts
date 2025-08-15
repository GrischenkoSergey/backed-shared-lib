import { Provider } from "@nestjs/common";
import { LazyModuleLoader } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { MODULE_OPTIONS_TOKEN } from '../infrastructure.module-definition';
import { InfrastructureFeatureOptions } from '../common/types';
import { InfrastructureConfig } from '../../common/types/configs';

export function BullMQProvider(): Provider {
    return {
        provide: BullModule,
        useFactory: async (
            options: InfrastructureFeatureOptions,
            infrastructure: InfrastructureConfig,
            lazyModuleLoader: LazyModuleLoader
        ) => {
            if (infrastructure.databases.redis.enabled) {
                const { BullModule } = await import('@nestjs/bullmq');
                const moduleRef = await lazyModuleLoader.load(() => BullModule.forRoot({
                    connection: {
                        host: infrastructure.databases.redis.hostname,
                        port: infrastructure.databases.redis.port
                    }
                }));
                return moduleRef;
            }
        },
        inject: [
            MODULE_OPTIONS_TOKEN,
            InfrastructureConfig,
            LazyModuleLoader
        ]
    };
}