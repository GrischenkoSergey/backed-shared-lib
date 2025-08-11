import * as process from 'process';
import { IncomingMessage } from "http";
import { RequestOptions } from "https";
import { SpanProcessor, SpanExporter, BatchSpanProcessor, NoopSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { AzureMonitorTraceExporter, AzureMonitorMetricExporter } from '@azure/monitor-opentelemetry-exporter';
import { MetricReader, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PromExporter } from '../components/metrics/prom-exporter';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { Instrumentation } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { MySQLInstrumentation } from '@opentelemetry/instrumentation-mysql';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation as RedisInstrumentationV2 } from '@opentelemetry/instrumentation-redis';
import { RedisInstrumentation as RedisInstrumentationV4 } from '@opentelemetry/instrumentation-redis-4';
import { createAzureSdkInstrumentation } from "@azure/opentelemetry-instrumentation-azure-sdk";
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { InfrastructureConfig } from '../../common/types/configs';

let OtelSDKInstance: OtelSDK;

class OtelSDK {
    private readonly config: InfrastructureConfig;
    private otelSDK: NodeSDK;
    private started = false;

    constructor(config: InfrastructureConfig) {
        OtelSDKInstance = this;
        this.config = config;
    }

    public async start() {
        if (this.started) return;

        this.started = true;

        const roleName = process.env['PROJECT_ID'];
        const spanProcessors: SpanProcessor[] = [];

        if (this.config.opentelemetry.node_sdk.tracers.azure.enabled) {
            spanProcessors.push(new BatchSpanProcessor(new AzureMonitorTraceExporter({
                connectionString: this.config.opentelemetry.node_sdk.tracers.azure.credentials.connection_string ?? "InstrumentationKey=00000000-0000-0000-0000-000000000000;",
            })));
        }

        let traceExporter: SpanExporter | undefined;

        if (this.config.opentelemetry.node_sdk.tracers.otel_collector.enabled) {
            const schema = this.config.opentelemetry.node_sdk.tracers.otel_collector.https ? 'https' : 'http';
            const hostname = this.config.opentelemetry.node_sdk.tracers.otel_collector.hostname || 'localhost';
            const port = this.config.opentelemetry.node_sdk.tracers.otel_collector.port || 4318;
            const path = this.config.opentelemetry.node_sdk.tracers.otel_collector.path.startsWith('/') ? this.config.opentelemetry.node_sdk.tracers.otel_collector.path.substring(1) : '/' + this.config.opentelemetry.node_sdk.tracers.otel_collector.path;

            const traceExporter = new OTLPTraceExporter({
                url: `${schema}://${hostname}:${port}${path}`
            });

            spanProcessors.push(new SimpleSpanProcessor(traceExporter));
        }

        if (spanProcessors.length == 0) {
            spanProcessors.push(new NoopSpanProcessor()); // Default to NoopSpanProcessor if no exporters are configured
        }

        const instrumentations: Instrumentation[] = getNodeAutoInstrumentations();

        for (const instrumentation of instrumentations) {
            if (instrumentation instanceof HttpInstrumentation) {
                if (this.config.opentelemetry.instrumentations.http.enabled) {
                    // configure HTTP instrumentation
                    instrumentation.setConfig({
                        ignoreIncomingRequestHook: (request: IncomingMessage) => {
                            if (request.method === 'OPTIONS' || request.url === '/health' || request.url === '/metrics') {
                                return true;
                            }
                            return false;
                        },
                        ignoreOutgoingRequestHook: (options: RequestOptions) => {
                            if (options.path === '/test') {
                                return true;
                            }
                            return false;
                        }
                    });
                } else {
                    instrumentation.disable();
                }
            } else if (instrumentation instanceof ExpressInstrumentation) {
                if (this.config.opentelemetry.instrumentations.http.enabled) {
                    // configure Express instrumentation
                } else {
                    instrumentation.disable();
                }
            } else if (instrumentation instanceof MongoDBInstrumentation) {
                if (this.config.opentelemetry.instrumentations.mongodb.enabled) {
                    // configure MongoDB instrumentation
                } else {
                    instrumentation.disable();
                }
            } else if (instrumentation instanceof MySQLInstrumentation) {
                if (this.config.opentelemetry.instrumentations.mysql.enabled) {
                    // configure MongoDB instrumentation
                } else {
                    instrumentation.disable();
                }
            } else if (instrumentation instanceof PgInstrumentation) {
                if (this.config.opentelemetry.instrumentations.postgresql.enabled) {
                    // configure PostgreSQL instrumentation
                } else {
                    instrumentation.disable();
                }
            } else if (instrumentation instanceof RedisInstrumentationV2) {
                if (this.config.opentelemetry.instrumentations.redis.enabled) {
                    // configure RedisV2 instrumentation
                } else {
                    instrumentation.disable();
                }
            } else if (instrumentation instanceof RedisInstrumentationV4) {
                if (this.config.opentelemetry.instrumentations.redis4.enabled) {
                    // configure RedisV4 instrumentation
                } else {
                    instrumentation.disable();
                }
            } else {
                instrumentation.disable();
            }
        }

        if (this.config.opentelemetry.instrumentations.azure_sdk.enabled) {
            instrumentations.push(createAzureSdkInstrumentation());
        }

        let metricReader: MetricReader | undefined;

        switch (this.config.opentelemetry.node_sdk.metrics.exporter) {
            case 'prometheus': {
                metricReader = this.config.opentelemetry.node_sdk.metrics.prometheus.enabled ? new PromExporter({
                    preventServerStart: true,
                    prefix: process.env.PROJECT_ID
                }) : undefined!;

                break;
            }
            case 'otel_collector': {
                if (this.config.opentelemetry.node_sdk.metrics.otel_collector.enabled) {
                    const schema = this.config.opentelemetry.node_sdk.metrics.otel_collector.https ? 'https' : 'http';
                    const hostname = this.config.opentelemetry.node_sdk.metrics.otel_collector.hostname || 'localhost';
                    const port = this.config.opentelemetry.node_sdk.metrics.otel_collector.port || 4318;
                    const path = this.config.opentelemetry.node_sdk.metrics.otel_collector.path.startsWith('/') ? this.config.opentelemetry.node_sdk.metrics.otel_collector.path.substring(1) : '/' + this.config.opentelemetry.node_sdk.metrics.otel_collector.path;

                    metricReader = new PeriodicExportingMetricReader({
                        exporter: new OTLPMetricExporter({
                            url: `${schema}://${hostname}:${port}${path}`
                        }),
                        exportIntervalMillis: this.config.opentelemetry.node_sdk.metrics.otel_collector.interval || 60000,
                    });
                }

                break;
            }
            case 'azure': {
                if (this.config.opentelemetry.node_sdk.metrics.azure.enabled) {
                    metricReader = new PeriodicExportingMetricReader({
                        exporter: new AzureMonitorMetricExporter({
                            connectionString: this.config.opentelemetry.node_sdk.metrics.azure.credentials.connection_string ?? "InstrumentationKey=00000000-0000-0000-0000-000000000000;",
                        }),
                        exportIntervalMillis: this.config.opentelemetry.node_sdk.metrics.azure.interval || 60000,
                    });
                }
                break;
            }
        }

        this.otelSDK = new NodeSDK({
            metricReader,
            traceExporter,
            resource: new Resource({
                [ATTR_SERVICE_NAME]: roleName
            }),
            spanProcessors,
            contextManager: new AsyncLocalStorageContextManager(),
            instrumentations,
        });

        this.otelSDK.start();

        if (this.config.opentelemetry.node_sdk.metrics.prometheus.enabled) {
            const otelAggregator = await import('./opentelemetry-aggregator');
            const aggregator = otelAggregator.default(metricReader);

            await aggregator.start();
        }
    }

    public async shutdown() {
        return this.otelSDK?.shutdown();
    }
}

const Otel = (config: InfrastructureConfig) => new OtelSDK(config);

export default Otel;

process.on('SIGTERM', () => {
    OtelSDKInstance?.shutdown()
        .then(
            () => console.log('Otel SDK shut down successfully'),
            err => console.log('Error shutting down Otel SDK', err)
        )
        .finally(() => process.exit(0));
});
