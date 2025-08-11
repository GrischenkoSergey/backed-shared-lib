import { ModuleRef, LazyModuleLoader } from "@nestjs/core";
import { Provider } from "@nestjs/common";
import { MODULE_OPTIONS_TOKEN } from '../infrastructure.module-definition';
import { InfrastructureFeatureOptions } from '../common/types';
import { InfrastructureConfig, SettingsConfig } from '../../common/types/configs';
import { TRACE_SERVICE, METRICS_SERVICE } from '../features';

export const METRICS_MODULE_REF = Symbol('METRICS_MODULE_REF');

export function MetricsServiceProvider(): Provider[] {
    return [
        {
            provide: METRICS_MODULE_REF,
            useFactory: async (
                options: InfrastructureFeatureOptions,
                infrastructure: InfrastructureConfig,
                settings: SettingsConfig,
                lazyModuleLoader: LazyModuleLoader
            ) => {
                if (infrastructure.opentelemetry.enabled) {
                    const { OpenTelemetryCoreModule } = await import('../components/metrics/otel-core.module');
                    const options = {
                        metrics: {
                            hostMetrics: infrastructure.opentelemetry.custom_metrics.process.enabled,
                            apiMetrics: {
                                enable: infrastructure.opentelemetry.custom_metrics.api.enabled,
                                defaultAttributes: {
                                    ...infrastructure.opentelemetry.custom_metrics.api.default_labels
                                },
                                ignoreRoutes: infrastructure.opentelemetry.custom_metrics.api.ignore_routes ?? [],
                                ignoreUndefinedRoutes: infrastructure.opentelemetry.custom_metrics.api.ignore_undefined_routes,
                                prefix: "api"
                            }
                        }
                    }

                    return await lazyModuleLoader.load(() => OpenTelemetryCoreModule.forRoot(options));
                }
            },
            inject: [
                MODULE_OPTIONS_TOKEN,
                InfrastructureConfig,
                SettingsConfig,
                LazyModuleLoader
            ]
        },
        {
            provide: TRACE_SERVICE,
            useFactory: async (metricsModuleRef: ModuleRef) => {
                if (metricsModuleRef) {
                    const { TraceService } = await import('../components/metrics/services/trace.service');
                    return metricsModuleRef.get(TraceService);
                }
            },
            inject: [METRICS_MODULE_REF]
        },
        {
            provide: METRICS_SERVICE,
            useFactory: async (metricsModuleRef: ModuleRef) => {
                if (metricsModuleRef) {
                    const { MetricService } = await import('../components/metrics/services/metric.service');
                    return metricsModuleRef.get(MetricService);
                }
            },
            inject: [METRICS_MODULE_REF]
        }
    ];
}
