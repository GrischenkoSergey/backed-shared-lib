import {
  DynamicModule,
  Inject,
  MiddlewareConsumer,
  Module,
  OnApplicationBootstrap,
  Provider,
  Type,
} from '@nestjs/common';
import { DefaultMetrics } from './default-metrics/metric';
import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import {
  OpenTelemetryModuleAsyncOptions,
  OpenTelemetryModuleOptions,
  OpenTelemetryOptionsFactory,
} from './common/opentelemetry-options.interface';
import { MetricService } from './services/metric.service';
import { ApiMetricsMiddleware } from './middleware/api-metrics.middleware';
import { OPENTELEMETRY_MODULE_OPTIONS } from './otel.constants';
import { TraceService } from './services/trace.service';
import { HttpAdapterHost } from '@nestjs/core';
import { getMiddlewareMountPoint } from './middleware.utils';

@Module({})
export class OpenTelemetryCoreModule implements OnApplicationBootstrap {
  constructor(
    @Inject(OPENTELEMETRY_MODULE_OPTIONS) private readonly options: OpenTelemetryModuleOptions = {},
    private readonly adapterHost: HttpAdapterHost
  ) { }

  static forRoot(options: OpenTelemetryModuleOptions = {}): DynamicModule {
    const openTelemetryModuleOptions = {
      provide: OPENTELEMETRY_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: OpenTelemetryCoreModule,
      providers: [openTelemetryModuleOptions, TraceService, MetricService],
      exports: [TraceService, MetricService],
    };
  }

  static forRootAsync(options: OpenTelemetryModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: OpenTelemetryCoreModule,
      imports: [...(options.imports || [])],
      providers: [...asyncProviders, TraceService, MetricService],
      exports: [TraceService, MetricService],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    const { apiMetrics = { enable: false } } = this.options?.metrics ?? {};

    if (apiMetrics.enable === true) {
      const adapter = this.adapterHost.httpAdapter;
      const mountPoint = getMiddlewareMountPoint(adapter);
      if (apiMetrics?.ignoreRoutes && apiMetrics?.ignoreRoutes.length > 0) {
        consumer
          .apply(ApiMetricsMiddleware)
          .exclude(...apiMetrics.ignoreRoutes)
          .forRoutes(mountPoint);
      } else {
        consumer.apply(ApiMetricsMiddleware).forRoutes(mountPoint);
      }
    }
  }

  async onApplicationBootstrap() {
    let hostMetrics = this.options?.metrics?.hostMetrics ?? false;

    if (hostMetrics) {
      const meterProvider = metrics.getMeterProvider() as MeterProvider;
      const host = new DefaultMetrics({ meterProvider });

      host.start();
    }
  }

  private static createAsyncOptionsProvider(options: OpenTelemetryModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: OPENTELEMETRY_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    if (options.useClass || options.useExisting) {
      const inject = [
        (options.useClass || options.useExisting) as Type<OpenTelemetryOptionsFactory>,
      ];
      return {
        provide: OPENTELEMETRY_MODULE_OPTIONS,
        useFactory: async (optionsFactory: OpenTelemetryOptionsFactory) =>
          optionsFactory.createOpenTelemetryOptions(),
        inject,
      };
    }

    throw new Error();
  }

  private static createAsyncProviders(options: OpenTelemetryModuleAsyncOptions): Provider[] {
    if (options.useFactory || options.useExisting) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<OpenTelemetryOptionsFactory>;

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }
}
