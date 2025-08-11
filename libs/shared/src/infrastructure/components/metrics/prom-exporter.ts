import { diag } from '@opentelemetry/api';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { ExporterConfig, PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const cluster = require('node:cluster');

export class PromExporter extends PrometheusExporter {
    constructor(config: ExporterConfig = {}, callback: (error: Error | void) => void = () => { }) {
        super(config, callback)
    }

    public getMetricsAsJSON(): Promise<any> {
        return this._exportJSONMetrics();
    }

    public serializeMetrics(resourceMetrics: ResourceMetrics) {
        const _serializer = Reflect.get(this, '_serializer');
        return _serializer?.serialize(resourceMetrics);
    }

    private readonly _exportJSONMetrics = () => {
        return this.collect().then(
            collectionResult => {
                const { resourceMetrics, errors } = collectionResult;
                if (errors.length) {
                    diag.error(
                        'PrometheusExporter: metrics collection errors',
                        ...errors
                    );
                }

                if (cluster.isWorker) {
                    resourceMetrics.scopeMetrics.forEach(workerMetrics => {
                        workerMetrics.metrics.forEach(metric => {
                            metric.dataPoints?.forEach(data => {
                                data.attributes = {
                                    ...data.attributes,
                                    'workerId': cluster.worker.id
                                };
                            });
                        });
                    });
                }

                return {
                    resource: {
                        attributes: resourceMetrics.resource.attributes,
                    },
                    scopeMetrics: resourceMetrics.scopeMetrics
                };
            },
            err => {
                console.log(`# failed to export metrics: ${err}`);
            }
        );
    };
}
