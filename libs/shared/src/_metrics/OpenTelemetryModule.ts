import { DynamicModule } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceService } from './Trace/TraceService';
import { Constants } from './Constants';
import {
  OpenTelemetryModuleConfig,
  OpenTelemetryModuleDefaultConfig,
} from './OpenTelemetryModuleConfig';
import { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import { OpenTelemetryService } from './OpenTelemetryService';
import { OpenTelemetryModuleAsyncOption } from './OpenTelemetryModuleAsyncOption';
import { DecoratorInjector } from './Trace/Injectors/DecoratorInjector';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";
import { OpentelemetryOptions, SettingsConfig } from '../common/types/configs';

// OpenTelemetryModule.forRoot({
//   serviceName: 'nestjs-opentelemetry-example',
//   // metricReader: new PrometheusExporter({
//   //   endpoint: 'metrics',
//   //   port: 3003,
//   //   prefix: process.env.PROJECT_ID,
//   // }),
//   traceAutoInjectors: [
//     ControllerInjector,
//     // GuardInjector,
//     // EventEmitterInjector,
//     // ScheduleInjector,
//     // PipeInjector,
//     // LoggerInjector,
//   ],
//   autoDetectResources: false,
//   instrumentations: [getNodeAutoInstrumentations()],
//   spanProcessors: [
//     new SimpleSpanProcessor(new AzureMonitorTraceExporter({
//       connectionString: "InstrumentationKey=b7ca7343-8632-41a2-b141-c8718c4cd6bb;IngestionEndpoint=https://polandcentral-0.in.applicationinsights.azure.com/;LiveEndpoint=https://polandcentral.livediagnostics.monitor.azure.com/;ApplicationId=69daac01-bb15-4292-8af7-620483d2d769",
//     }))
//   ],
// })


export class OpenTelemetryModule {
  static async forRoot(config: SettingsConfig, options: OpentelemetryOptions): Promise<DynamicModule> {
    const configuration: Partial<OpenTelemetryModuleConfig> = {
      serviceName: config.project_id,
      metricReader: new PrometheusExporter({
        endpoint: 'metrics',
        port: 3003,
        prefix: process.env.PROJECT_ID,
      }),
      spanProcessors: [
        new SimpleSpanProcessor(new AzureMonitorTraceExporter({
          connectionString: options.node_sdk.azure.credentials.connection_string || "InstrumentationKey=00000000-0000-0000-0000-000000000000;",
        }))
      ],
    }
    // configuration = { ...OpenTelemetryModuleDefaultConfig, ...configuration };

    const injectors = configuration?.traceAutoInjectors ?? [];

    return {
      global: true,
      module: OpenTelemetryModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ...injectors,
        TraceService,
        OpenTelemetryService,
        DecoratorInjector,
        this.buildProvider(configuration),
        this.buildInjectors(configuration),
        this.buildTracer(),
        {
          provide: Constants.SDK_CONFIG,
          useValue: configuration,
        },
      ],
      exports: [TraceService, BasicTracerProvider],
    };
  }

  private static buildProvider(
    configuration?: Partial<OpenTelemetryModuleConfig>,
  ): FactoryProvider {
    return {
      provide: Constants.SDK,
      useFactory: async () => {
        const sdk = new NodeSDK(configuration);
        await sdk.start();
        return sdk;
      },
    };
  }

  private static buildInjectors(
    configuration?: Partial<OpenTelemetryModuleConfig>,
  ): FactoryProvider {
    const injectors = configuration?.traceAutoInjectors ?? [];
    return {
      provide: Constants.SDK_INJECTORS,
      useFactory: async (...injectors) => {
        for await (const injector of injectors) {
          if (injector['inject']) await injector.inject();
        }
      },
      inject: [
        DecoratorInjector,
        // eslint-disable-next-line @typescript-eslint/ban-types
        ...(injectors as Function[]),
      ],
    };
  }

  // static async forRootAsync(
  //   configuration: OpenTelemetryModuleAsyncOption = {},
  // ): Promise<DynamicModule> {
  //   return {
  //     global: true,
  //     module: OpenTelemetryModule,
  //     imports: [...configuration?.imports!, EventEmitterModule.forRoot()],
  //     providers: [
  //       TraceService,
  //       OpenTelemetryService,
  //       this.buildAsyncProvider(),
  //       this.buildAsyncInjectors(),
  //       this.buildTracer(),
  //       {
  //         provide: Constants.SDK_CONFIG,
  //         useFactory: configuration.useFactory!,
  //         inject: configuration.inject,
  //       },
  //     ],
  //     exports: [TraceService, BasicTracerProvider],
  //   };
  // }

  // private static buildAsyncProvider(): FactoryProvider {
  //   return {
  //     provide: Constants.SDK,
  //     useFactory: async (config) => {
  //       config = { ...OpenTelemetryModuleDefaultConfig, ...config };
  //       const sdk = new NodeSDK(config);
  //       await sdk.start();
  //       return sdk;
  //     },
  //     inject: [Constants.SDK_CONFIG],
  //   };
  // }

  // private static buildAsyncInjectors(): FactoryProvider {
  //   return {
  //     provide: Constants.SDK_INJECTORS,
  //     useFactory: async (config, moduleRef: ModuleRef) => {
  //       config = { ...OpenTelemetryModuleDefaultConfig, ...config };
  //       const injectors =
  //         config.traceAutoInjectors ??
  //         OpenTelemetryModuleDefaultConfig.traceAutoInjectors;

  //       const decoratorInjector = await moduleRef.create(DecoratorInjector);
  //       await decoratorInjector.inject();

  //       for await (const injector of injectors) {
  //         const created = await moduleRef.create(injector);
  //         if (created['inject']) await created.inject();
  //       }

  //       return {};
  //     },
  //     inject: [Constants.SDK_CONFIG, ModuleRef],
  //   };
  // }

  private static buildTracer() {
    return {
      provide: BasicTracerProvider,
      useFactory: (traceService: TraceService) => traceService.getTracer(),
      inject: [TraceService],
    };
  }
}
