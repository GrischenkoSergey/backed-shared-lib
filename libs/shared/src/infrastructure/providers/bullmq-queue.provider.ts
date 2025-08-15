import { Provider } from "@nestjs/common";
import { LazyModuleLoader } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { MODULE_OPTIONS_TOKEN } from '../infrastructure.module-definition';
import { InfrastructureFeatureOptions } from '../common/types';
import { SettingsConfig, InfrastructureConfig } from '../../common/types/configs';

export function BullMQQueueProvider(queueName: string): Provider {
    return {
        provide: BullModule,
        useFactory: async (
            config: SettingsConfig,
            infrastructure: InfrastructureConfig,
            lazyModuleLoader: LazyModuleLoader
        ) => {
            if (infrastructure.databases.redis.enabled) {
                const { BullModule } = await import('@nestjs/bullmq');
                const moduleRef = await lazyModuleLoader.load(() => BullModule.registerQueue({
                    name: queueName,
                    prefix: `${config.solution_id}-${config.project_id}-${config.project_unique_id}:`
                }));
                return moduleRef;
            }
        },
        inject: [
            SettingsConfig,
            InfrastructureConfig,
            LazyModuleLoader
        ]
    };
}