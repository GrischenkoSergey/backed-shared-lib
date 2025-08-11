import { ConsoleLogger } from '@nestjs/common';
import { LoggerService } from '@nestjs/common/services/logger.service';
import Logger, { LogData } from '../common/interfaces';

export default class NestjsLoggerServiceAdapter extends ConsoleLogger implements LoggerService {
  public constructor(public readonly innerLogger: Logger) {
    super();
  }

  public log(message: any, ...optionalParams: any[]) {
    return this.innerLogger.info(message, this.getLogData(...optionalParams));
  }

  public error(message: any, ...optionalParams: any[]) {
    return this.innerLogger.error(message, this.getLogData(...optionalParams));
  }

  public warn(message: any, ...optionalParams: any[]) {
    return this.innerLogger.warn(message, this.getLogData(...optionalParams));
  }

  public debug(message: any, ...optionalParams: any[]) {
    return this.innerLogger.debug(message, this.getLogData(...optionalParams));
  }

  public verbose(message: any, ...optionalParams: any[]) {
    return this.innerLogger.info(message, this.getLogData(...optionalParams));
  }

  public fatal(message: any, ...optionalParams: any[]) {
    return this.innerLogger.error(message, this.getLogData(...optionalParams));
  }

  private getLogData(...optionalParams: any[]): LogData {
    return {
      sourceClass: optionalParams[0] ?? undefined,
      context: optionalParams[1] ?? undefined,
      error: optionalParams[2] ?? undefined,
      props: optionalParams[3] ?? undefined
    };
  }
}