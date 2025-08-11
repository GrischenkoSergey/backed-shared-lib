import { Module, Inject, OnModuleInit } from '@nestjs/common';
import { SchedulerService } from "./services/scheduler.service";
import { SchedulerStateService } from "./services/scheduler-state.service";
import { TRACE_SERVICE, ITracer } from '../../features/tracer.feature';
import { InfrastructureConfig, TracerType } from '../../../common/types/configs';

@Module({
    controllers: [],
    providers: [
        SchedulerService,
        SchedulerStateService,
    ],
    exports: [
        SchedulerService,
    ],
})
export class SchedulerModule implements OnModuleInit {
    constructor(
        @Inject(TRACE_SERVICE) private readonly traceService: ITracer,
        @Inject(InfrastructureConfig) private readonly config: InfrastructureConfig,
    ) {
    }

    onModuleInit() {
        if (this.config.opentelemetry.enabled && this.config.opentelemetry.tracer == TracerType.NodeSDK) {
            const span = this.traceService.startSpan('SchedulerModule');
            span?.addEvent('SchedulerModule is loaded', {
                "Process ID": process.pid,
            });
            span?.end();
        }
    }
}
