import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from "../schedulers/services/scheduler.service";
import { StatsService } from "./stats.service";
import { StatsConsumer, StatsEvents } from "./stats.consumer";
import { SchedulerStateService } from "../schedulers/services/scheduler-state.service";
import { ITracer, TRACE_SERVICE } from '../../features/tracer.feature';
import { InfrastructureConfig, TracerType, SettingsConfig } from '../../../common/types/configs';

@Module({
    imports: [
        BullModule.registerQueueAsync({
            name: 'stats',
            useFactory: (config: SettingsConfig) => ({
                prefix: `${config.solution_id}-${config.project_id}-${config.project_unique_id}:`
            }),
            inject: [SettingsConfig]
        })
    ],
    controllers: [],
    providers: [
        SchedulerService,
        SchedulerStateService,
        StatsService,
        StatsConsumer,
        StatsEvents
    ],
    exports: [
        StatsService
    ],
})
export class StatsModule implements OnModuleInit {
    constructor(
        @Inject(TRACE_SERVICE) private readonly traceService: ITracer,
        @Inject(InfrastructureConfig) private readonly config: InfrastructureConfig,
    ) {
    }

    onModuleInit() {
        if (this.config.opentelemetry.enabled && this.config.opentelemetry.tracer == TracerType.NodeSDK) {
            const span = this.traceService.startSpan('StatsModule');
            span?.addEvent('StatsModule is loaded', {
                "Process ID": process.pid,
            });
            span?.end();
        }
    }
}
