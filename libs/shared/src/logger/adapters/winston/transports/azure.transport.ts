import * as moment from 'moment-timezone';
import * as WinstonTransport from 'winston-transport';
import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { SeverityNumber, Logger } from "@opentelemetry/api-logs";
import { InfrastructureConfig } from '../../../../common/types/configs';

const cluster = require('cluster');

class AzureTransport extends WinstonTransport {
  public static instance: AzureTransport;

  private readonly config: InfrastructureConfig;
  private readonly logger: Logger;
  private readonly loggerName: string;
  private readonly transportName: string;
  private readonly loggerProvider: LoggerProvider;

  private readonly azureSeverityMap = {
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
    trace: SeverityNumber.TRACE,
    fatal: SeverityNumber.FATAL
  };

  constructor(config: InfrastructureConfig) {
    super();

    AzureTransport.instance = this;

    this.config = config;
    this.transportName = process.env['PROJECT_ID']!;
    this.loggerName = process.env['PROJECT_ID'] + (cluster.isMaster ? '-master' : '-worker-' + cluster.worker.id);

    this.loggerProvider = new LoggerProvider({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: this.transportName,
      }),
    });

    const logExporter = new AzureMonitorLogExporter({
      connectionString: this.config.log.azure.credentials.connection_string || "InstrumentationKey=00000000-0000-0000-0000-000000000000;",
    });

    this.loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));
    this.logger = this.loggerProvider.getLogger(this.loggerName);
  }

  public override log({ message, level, ...properties }, callback) {
    if (!this.logger) return;

    const severity = this.azureSeverityMap[level] ?? this.azureSeverityMap.info;
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


const AzureLogger = (config: InfrastructureConfig) => new AzureTransport(config);

process.on('SIGTERM', () => {
  AzureTransport.instance?.shutdown()
    .then(
      () => console.log('Azure logger shut down successfully'),
      err => console.log('Error shutting down Azure logger', err)
    )
    .finally(() => process.exit(0));
});

export default AzureLogger;
