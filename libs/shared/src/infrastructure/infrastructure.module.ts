import {
  Global,
  DynamicModule,
  Module,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './infrastructure.module-definition';
import { ConfigModule } from '../config/config.module';
import { InfrastructureConfig, SettingsConfig, TracerType } from '../common/types/configs';
import {
  MetricsServiceProvider,
  RedisServiceProvider,
  SchedulerServiceProvider,
  StatsServiceProvider,
  BullMQProvider
} from './providers';
import { InfrastructureFeatureOptions } from './common/types';
import {
  METRICS_SERVICE,
  TRACE_SERVICE,
  SCHEDULER_SERVICE,
  STATS_SERVICE,
  REDIS_SERVICE,
  IRedisClient,
  ITracer,
  IMetric
} from './features';
import { StatsController } from './controllers/stats.controller';
import { RATELIMITER_MODULE_PARAMS_TOKEN, RateLimiterModuleParams } from './components/redis/ratelimiter/params';
import { RateLimiterAsserterProvider } from './components/redis/ratelimiter/asserter.svc';
import { RateLimiterGuardProvider } from './components/redis/ratelimiter/guard';
import { getRequestIPAndPath } from '../common/helpers/core-utils';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature([
      InfrastructureConfig,
      SettingsConfig
    ])
  ],
  providers: [
    BullMQProvider(),
    ...MetricsServiceProvider(),
    ...RedisServiceProvider(),
    SchedulerServiceProvider(),
    StatsServiceProvider(),
    {
      provide: RATELIMITER_MODULE_PARAMS_TOKEN,
      useFactory: (redisClient: IRedisClient): RateLimiterModuleParams => {
        // Default rate limiter parameters
        return {
          storeClient: redisClient?.getClient('ratelimiter'),
          points: 10,
          duration: 10, // in seconds
          getId: getRequestIPAndPath,
          // uncomment for custom error body
          // createErrorBody: (limit: RateLimiterResult) => ({
          //   error: {
          //     code: 'MY-RATE-LIMIT-ERROR-CODE',
          //     params: limit,
          //   },
          // }),
        };
      },
      inject: [REDIS_SERVICE]
    },
    RateLimiterGuardProvider,
    RateLimiterAsserterProvider,
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
    @Inject(METRICS_SERVICE) private readonly metricsService: IMetric
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
