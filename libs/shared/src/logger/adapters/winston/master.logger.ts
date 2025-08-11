import * as winston from 'winston';
import Logger, { LogData, LogLevel } from '../../common/interfaces';
import { getLoggerFormatOptions } from './transports/transports.js';

export default class MasterLogger implements Logger {
  private readonly logger: winston.Logger;

  public constructor(transports: winston.transport[]) {
    this.logger = getLoggerFormatOptions(transports);
  }

  public log(level: LogLevel, message: string, data?: LogData) {
    return this.logger.log(level, message, this.getLogData(data));
  }

  public debug(message: string, data?: LogData) {
    return this.logger.debug(message, this.getLogData(data));
  }

  public info(message: string, data?: LogData) {
    return this.logger.info(message, this.getLogData(data));
  }

  public warn(message: string, data?: LogData) {
    return this.logger.warn(message, this.getLogData(data));
  }

  public error(message: string, data?: LogData) {
    return this.logger.error(message, this.getLogData(data));
  }

  public getLogData(data?: LogData) {
    return {
      error: data?.error,
      context: data?.context,
      app: data?.app,
      sourceClass: data?.sourceClass,
      correlationId: data?.correlationId,
      props: data?.props
    };
  }
}
