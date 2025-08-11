
export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug'
}

export interface Log {
  timestamp: number;
  level: LogLevel;
  message: string;
  data: LogData;
}

export interface LogData {
  app?: string;
  sourceClass?: string;
  context?: string;
  correlationId?: string;
  error?: any;
  props?: NodeJS.Dict<any>;
}

export const LoggerBaseKey = Symbol();
export const LoggerKey = Symbol();

export default interface Logger {
  log(level: LogLevel, message: string, data?: LogData): void;
  debug(message: string, data?: LogData): void;
  info(message: string, data?: LogData): void;
  warn(message: string, data?: LogData): void;
  error(message: string, data?: LogData): void;
}

