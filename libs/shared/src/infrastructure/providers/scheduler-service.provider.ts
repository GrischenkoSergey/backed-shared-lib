import { Provider } from "@nestjs/common";
import { LazyModuleLoader } from '@nestjs/core';
import { MODULE_OPTIONS_TOKEN } from '../infrastructure.module-definition';
import { InfrastructureFeatureOptions } from '../common/types';
import { InfrastructureConfig } from '../../common/types/configs';
import { SCHEDULER_SERVICE } from '../features';

export function SchedulerServiceProvider(): Provider {
    return {
        provide: SCHEDULER_SERVICE,
        useFactory: async (
            options: InfrastructureFeatureOptions,
            infrastructure: InfrastructureConfig,
            lazyModuleLoader: LazyModuleLoader
        ) => {
            if (infrastructure.scheduler.enabled) {
                const { SchedulerModule } = await import('../components/schedulers/scheduler.module');
                const { SchedulerService } = await import('../components/schedulers/services/scheduler.service');

                const moduleRef = await lazyModuleLoader.load(() => SchedulerModule);
                const scheduler = moduleRef.get(SchedulerService);

                return scheduler;
            }
        },
        inject: [
            MODULE_OPTIONS_TOKEN,
            InfrastructureConfig,
            LazyModuleLoader
        ]
    };
}