import * as process from 'process';
import { IncomingMessage } from "http";
import { RequestOptions } from "https";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { InfrastructureConfig, HttpInstrumentationOptions } from '../../common/types/configs';

class AzureMonitor {
    public static instance: AzureMonitor;
    private readonly config: InfrastructureConfig;

    private readonly httpInstrumentationConfig = (config: HttpInstrumentationOptions) => ({
        enabled: config.enabled,
        ignoreIncomingRequestHook: (request: IncomingMessage) => {
            if (request.method === 'OPTIONS') {
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

    constructor(config: InfrastructureConfig) {
        AzureMonitor.instance = this;
        this.config = config;
    }

    public async start() {
        const roleName = process.env['PROJECT_ID'];

        useAzureMonitor({
            azureMonitorExporterOptions: {
                connectionString: this.config.opentelemetry.azure_monitor.credentials.connection_string || "InstrumentationKey=00000000-0000-0000-0000-000000000000;"
            },
            resource: new Resource({
                [ATTR_SERVICE_NAME]: roleName,
            }),
            samplingRatio: this.config.opentelemetry.azure_monitor.sampling_ratio || 1,
            enableLiveMetrics: this.config.opentelemetry.azure_monitor.enable_live_metrics,
            enableStandardMetrics: this.config.opentelemetry.azure_monitor.enable_standard_metrics,
            enableTraceBasedSamplingForLogs: true,
            enablePerformanceCounters: this.config.opentelemetry.azure_monitor.enable_performance_counters,
            instrumentationOptions: {
                http: this.httpInstrumentationConfig(this.config.opentelemetry.instrumentations.http),
                mongoDb: {
                    enabled: this.config.opentelemetry.instrumentations.mongodb.enabled,
                },
                mySql: {
                    enabled: this.config.opentelemetry.instrumentations.mysql.enabled,
                },
                postgreSql: {
                    enabled: this.config.opentelemetry.instrumentations.postgresql.enabled,
                },
                redis: {
                    enabled: this.config.opentelemetry.instrumentations.redis.enabled,
                },
                redis4: {
                    enabled: this.config.opentelemetry.instrumentations.redis4.enabled,
                }
            },
            browserSdkLoaderOptions: {
                enabled: false,
                connectionString: ""
            }
        })
    }
}

const AzMonitor = (config: InfrastructureConfig) => new AzureMonitor(config);

export default AzMonitor;
