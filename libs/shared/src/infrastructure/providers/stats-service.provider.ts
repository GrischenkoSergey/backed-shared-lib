import { Provider } from "@nestjs/common";
import { LazyModuleLoader } from '@nestjs/core';
import { MODULE_OPTIONS_TOKEN } from '../infrastructure.module-definition';
import { InfrastructureFeatureOptions } from '../common/types';
import { InfrastructureConfig } from '../../common/types/configs';
import { STATS_SERVICE } from '../features';
import { UnexpectedRuntimeError } from '../../common/errors/unexpected-runtime.error';

export function StatsServiceProvider(): Provider {
    return {
        provide: STATS_SERVICE,
        useFactory: async (
            options: InfrastructureFeatureOptions,
            infrastructure: InfrastructureConfig,
            lazyModuleLoader: LazyModuleLoader
        ) => {
            if (infrastructure.server_stats.enabled) {
                if (!infrastructure.scheduler.enabled) {
                    throw new UnexpectedRuntimeError("Scheduler should be enabled for the 'Server Stats' feature");
                }

                if (infrastructure.databases.redis.enabled) {
                    const { StatsModule } = await import('../components/statistics/stats.module');
                    const { StatsBullService } = await import('../components/statistics/stats-bull.service');

                    const moduleRef = await lazyModuleLoader.load(() => StatsModule.registerForBull());
                    const stats = moduleRef.get(StatsBullService);

                    return stats;
                }

                const { StatsModule } = await import('../components/statistics/stats.module');
                const { StatsService } = await import('../components/statistics/stats.service');

                const moduleRef = await lazyModuleLoader.load(() => StatsModule.register());
                const stats = moduleRef.get(StatsService);

                return stats;
            }
        },
        inject: [
            MODULE_OPTIONS_TOKEN,
            InfrastructureConfig,
            LazyModuleLoader
        ]
    };
}
