import {
  Global,
  DynamicModule,
  Module,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './infrastructure.module-definition';
import { ConfigModule } from '../config/config.module';
import { InfrastructureConfig, SettingsConfig, TracerType } from '../common/types/configs';
import { MetricsServiceProvider } from './providers/metrics-service.provider';
import { RedisServiceProvider } from './providers/redis.provider';
import { SchedulerServiceProvider } from './providers/scheduler-service.provider';
import { StatsServiceProvider } from './providers/stats-service.provider';
import { InfrastructureFeatureOptions } from './common/types';
import {
  METRICS_SERVICE,
  TRACE_SERVICE,
  SCHEDULER_SERVICE,
  STATS_SERVICE,
  REDIS_SERVICE
} from './features';
import { ITracer } from './features/tracer.feature';
import { IMetric } from './features/metrics.feature';
import { StatsController } from './controllers/stats.controller';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature([
      InfrastructureConfig, SettingsConfig
    ]),
    BullModule.forRootAsync({
      imports: [],
      useFactory: async (config: InfrastructureConfig) => {
        return {
          connection: {
            host: config.databases.redis.enabled ? config.databases.redis.hostname : undefined,
            port: config.databases.redis.enabled ? config.databases.redis.port : undefined,
          }
        };
      },
      inject: [InfrastructureConfig],
    }),
  ],
  providers: [
    ...MetricsServiceProvider(),
    ...RedisServiceProvider(),
    SchedulerServiceProvider(),
    StatsServiceProvider(),
  ],
  controllers: [
    StatsController
  ],
  exports: [
    METRICS_SERVICE,
    TRACE_SERVICE,
    SCHEDULER_SERVICE,
    STATS_SERVICE,
    REDIS_SERVICE,
  ]
})
export class InfrastructureModule extends ConfigurableModuleClass implements OnModuleInit {
  static registerAsync(options): DynamicModule {
    return {
      ...super.registerAsync(options)
    };
  }

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: InfrastructureFeatureOptions,
    @Inject(InfrastructureConfig) private readonly config: InfrastructureConfig,
    @Inject(TRACE_SERVICE) private readonly traceService: ITracer,
    @Inject(METRICS_SERVICE) private readonly metricsService: IMetric,
  ) {
    super();
  }

  async onModuleInit() {
    if (this.config.opentelemetry.enabled && this.config.opentelemetry.tracer == TracerType.NodeSDK) {
      const span = this.traceService.startSpan('InfrastructureModule');
      span.addEvent('InfrastructureModule is loaded', {
        "Process ID": process.pid,
      });
      span.end();
    }
  }
}
