import * as process from 'node:process';
import { PromExporter } from '../components/metrics/prom-exporter';
import { MetricReader } from '@opentelemetry/sdk-metrics';

const cluster = require('node:cluster');

const GET_METRICS_REQ = `${process.env.PROJECT_ID}:getMetricsReq`;
const GET_METRICS_RES = `${process.env.PROJECT_ID}:getMetricsRes`;

class OtelAggregator {
    private readonly requests = new Map();
    private readonly metricSources: any[] = [];
    private listenersAdded = false;
    private requestCtr = 0;
    private readonly metricReader;

    constructor(metricReader?: MetricReader) {
        this.metricReader = metricReader ?? new PromExporter({ preventServerStart: true, prefix: process.env.PROJECT_ID });
        this.metricSources.push(this.metricReader);
    }

    public async start() {
        if (this.listenersAdded) return;

        this.listenersAdded = true;

        if (cluster.isMaster) {
            cluster.on('message', (worker, message) => {
                if (message.type === GET_METRICS_RES) {
                    const request = this.requests.get(message.requestId);

                    if (message.error) {
                        request.done(new Error(message.error));
                        return;
                    }

                    const metrics = JSON.parse(message.metrics);

                    metrics.forEach(registry => {
                        return request.responses.push(registry);
                    });

                    request.pending--;

                    if (request.pending === 0) {
                        this.requests.delete(message.requestId);

                        clearTimeout(request.errorTimeout);

                        const metrics = this.merge(request.responses);
                        const promString = this.metricReader.serializeMetrics(metrics)

                        request.done(null, promString);
                    }
                }
            });
        }

        if (cluster.isWorker) {
            process.on('message', (message: any) => {
                if (message.type === GET_METRICS_REQ) {
                    Promise.all(this.metricSources.map(r => r.getMetricsAsJSON()))
                        .then(metrics => {
                            if (typeof process.send === 'function') {
                                process.send({
                                    type: GET_METRICS_RES,
                                    requestId: message.requestId,
                                    metrics: JSON.stringify(metrics),
                                });
                            }
                        })
                        .catch(error => {
                            if (typeof process.send === 'function') {
                                process.send({
                                    type: GET_METRICS_RES,
                                    requestId: message.requestId,
                                    error: error.message,
                                });
                            }
                        });
                }
            });
        }
    }

    public async clusterMetrics() {
        const requestId = this.requestCtr++;

        return new Promise((resolve, reject) => {
            let settled = false;

            const done = (err: Error | null, result: any) => {
                if (settled) return;

                settled = true;

                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            }

            const request = {
                responses: [],
                pending: 0,
                done,
                errorTimeout: setTimeout(() => {
                    const err = new Error('Operation timed out.');
                    request.done(err, null);
                }, 5000),
            };

            this.requests.set(requestId, request);

            const message = {
                type: GET_METRICS_REQ,
                requestId,
            };

            for (const id in cluster.workers) {
                if (cluster.workers[id].isConnected()) {
                    cluster.workers[id].send(message);
                    request.pending++;
                }
            }

            if (request.pending === 0) {
                clearTimeout(request.errorTimeout);
                process.nextTick(() => done(null, ''));
            }
        });
    }

    private merge(metricsArr) {
        const mergedMetrics: { resource: any, scopeMetrics: { scope: any, metrics: any[] }[] } = {
            resource: metricsArr[0].resource,
            scopeMetrics: []
        };

        if (mergedMetrics.resource?.attributes?.["process.pid"]) {
            mergedMetrics.resource.attributes["process.pid"] = process.pid;
        }

        metricsArr.forEach(metrics => {
            metrics.scopeMetrics.forEach(workerMetrics => {
                let scope = mergedMetrics.scopeMetrics.find(e => e.scope.name === workerMetrics.scope.name);

                scope ??= mergedMetrics.scopeMetrics[
                    mergedMetrics.scopeMetrics.push({
                        scope: workerMetrics.scope,
                        metrics: []
                    }) - 1
                ];

                workerMetrics.metrics.forEach(metric => {
                    scope.metrics.push(metric);
                });
            });
        });

        return mergedMetrics;
    }
}

const OtelAggregatorInstance = (metricReader?: MetricReader) => new OtelAggregator(metricReader);

export default OtelAggregatorInstance;
