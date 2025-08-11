import * as moment from 'moment-timezone';
import * as WinstonTransport from 'winston-transport';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'; import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { LoggerProvider, BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { SeverityNumber, Logger } from "@opentelemetry/api-logs";
import { InfrastructureConfig } from '../../../../common/types/configs';

const cluster = require('cluster');

class OtelTransport extends WinstonTransport {
  public static instance: OtelTransport;

  private readonly config: InfrastructureConfig;
  private readonly logger: Logger;
  private readonly loggerName: string;
  private readonly transportName: string;
  private readonly loggerProvider: LoggerProvider;

  private readonly otelSeverityMap = {
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
    trace: SeverityNumber.TRACE,
    fatal: SeverityNumber.FATAL
  };

  constructor(config: InfrastructureConfig) {
    super();

    OtelTransport.instance = this;

    this.config = config;
    this.transportName = process.env['PROJECT_ID']!;
    this.loggerName = process.env['PROJECT_ID'] + (cluster.isMaster ? '-master' : '-worker-' + cluster.worker.id);

    this.loggerProvider = new LoggerProvider({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: this.transportName,
      }),
    });

    const schema = this.config.log.otel_collector.https ? 'https' : 'http';
    const hostname = this.config.log.otel_collector.hostname || 'localhost';
    const port = this.config.log.otel_collector.port || 4318;
    const path = this.config.log.otel_collector.path.startsWith('/') ? this.config.log.otel_collector.path.substring(1) : '/' + this.config.log.otel_collector.path;

    const logExporter = new OTLPLogExporter({
      url: `${schema}://${hostname}:${port}${path}`
    })

    this.loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
    this.logger = this.loggerProvider.getLogger(this.loggerName);
  }

  public override log({ message, level, ...properties }, callback) {
    if (!this.logger) return;

    const severity = this.otelSeverityMap[level] ?? this.otelSeverityMap.info;
    const attributes = this.toPlain(properties, {});

    let date;

    if (attributes.timestamp) {
      date = moment(attributes.timestamp, 'DD/MM/YYYY, HH:mm:ss', true).toDate();
    } else {
      date = new Date();
    }

    this.logger.emit({
      severityNumber: severity,
      severityText: level?.toUpperCase() || 'INFO',
      body: message,
      attributes,
      timestamp: date
    });

    callback();
  }

  public async shutdown() {
    try {
      await this.loggerProvider?.forceFlush();
      await this.loggerProvider?.shutdown();
    } catch {
      // suppress all
    }
  }

  private toPlain(obj: any, outputObj: any, fieldsToExclude: string[] = []) {
    for (let key in obj) {
      if (!fieldsToExclude.includes(key)) {
        if (typeof obj[key] == 'object') {
          outputObj = this.toPlain(obj[key], outputObj, fieldsToExclude)
        } else if (obj[key]) {
          outputObj[key] = obj[key];
        }
      }
    }

    return outputObj;
  }
}


const OtelLogger = (config: InfrastructureConfig) => new OtelTransport(config);

process.on('SIGTERM', () => {
  OtelTransport.instance?.shutdown()
    .then(
      () => console.log('Opentelemetry logger shut down successfully'),
      err => console.log('Error shutting down Opentelemetry logger', err)
    )
    .finally(() => process.exit(0));
});

export default OtelLogger;
