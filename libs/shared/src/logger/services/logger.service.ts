import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';
import Logger, { LoggerBaseKey } from '../common/interfaces';
import { LogData, LogLevel } from '../common/interfaces';
import ContextStorageService, { ContextStorageServiceKey } from '../../common/interfaces/context-storage.service';
import { SettingsConfig } from '../../common/types/configs';

@Injectable({ scope: Scope.TRANSIENT })
export default class LoggerService implements Logger {
  private readonly sourceClass: string;

  public constructor(
    @Inject(LoggerBaseKey) private readonly logger: Logger,
    @Inject(SettingsConfig) private readonly settings: SettingsConfig,
    @Inject(INQUIRER) parentClass: object,
    @Inject(ContextStorageServiceKey)
    private readonly contextStorageService: ContextStorageService,
  ) {
    this.sourceClass = parentClass?.constructor.name || 'Global';
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

  private getLogData(data?: LogData) {
    if (Array.isArray(data?.sourceClass)) {
      data.sourceClass = data?.sourceClass.join('/');
    }

    return {
      error: data?.error,
      context: data?.context,
      app: data?.app ?? this.settings.product_name,
      sourceClass: data?.sourceClass ?? this.sourceClass,
      correlationId: data?.correlationId ?? this.contextStorageService?.getContextId(),
      props: data?.props
    };
  }
}
