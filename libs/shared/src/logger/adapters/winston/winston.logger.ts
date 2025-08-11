import * as winston from 'winston';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { LogData } from '../../common/interfaces';
import Logger from '../../../logger/common/interfaces';
import MasterLogger from './master.logger';

export const WinstonLoggerTransportsKey = Symbol();

@Injectable()
export default class WinstonLogger extends MasterLogger implements Logger {
  private readonly app;

  public constructor(
    @Inject(WinstonLoggerTransportsKey) transports: winston.transport[],
    private readonly configService: NestConfigService
  ) {
    super(transports);
    this.app = configService.get<string>('instance.product_name')!;
  }

  public getLogData(data?: LogData) {
    return {
      error: data?.error,
      context: data?.context,
      app: data?.app ?? this.app,
      sourceClass: data?.sourceClass,
      correlationId: data?.correlationId,
      props: data?.props
    };
  }
}