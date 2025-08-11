import * as winston from 'winston';
import { LogLevel } from '../../../common/interfaces';
import { InfrastructureConfig, StorageConfig } from '../../../../common/types/configs';

export async function loadTransports(config: InfrastructureConfig, storage: StorageConfig) {
  const transports: winston.transport[] = [];

  if (config.log.console.enabled) {
    const consoleTransport = await import('./console.transport');
    transports.push(consoleTransport.default());
  }

  if (config.log.file.enabled) {
    const fileTransport = await import('./file.transport');
    transports.push(fileTransport.default(storage));
  }

  if (config.log.slack.enabled) {
    const slackTransport = await import('./slack.transport');
    transports.push(slackTransport.default(config));
  }

  if (config.log.azure.enabled) {
    const azureTransport = await import('./azure.transport');
    transports.push(azureTransport.default(config));
  }

  if (config.log.otel_collector.enabled) {
    const otelTransport = await import('./otel-collector.transport');
    transports.push(otelTransport.default(config));
  }

  // new winstonMongoDB.MongoDB({
  //   level: 'info',
  //   db: 'mongodb://localhost:27017/logs_db',
  //   options: {
  //     useUnifiedTopology: true,
  //   },
  //   collection: 'logs',
  //   format: winston.format.combine(
  //     winston.format.timestamp(), // Add a timestamp to MongoDB logs
  //     winston.format.json(), // Use JSON format for MongoDB logs
  //   ),
  // }),

  return transports;
};

export function getLoggerFormatOptions(transports: winston.transport[]) {
  const levels: { [key: string]: number } = {};

  let cont = 0;

  Object.values(LogLevel).forEach((level) => {
    levels[level] = cont;
    cont++;
  });

  return winston.createLogger({
    level: LogLevel.Debug,
    levels,
    format: winston.format.combine(
      // winston.format.splat()
      winston.format.timestamp({
        format: 'DD/MM/YYYY, HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      // Add custom Log fields to the log
      winston.format((info, opts) => {
        info.label = info.organization || '';
        return info;
      })(),
      winston.format.metadata(
        {
          key: 'data',
          fillExcept: ['timestamp', 'level', 'message'],
        }
      ),
      winston.format.json(),
    ),
    transports,
    exceptionHandlers: transports,
    rejectionHandlers: transports,
  });
}
