import { LoggerService } from '@nestjs/common';

export class ConfigLogger implements LoggerService {
  log(message: any, context?: string): any { /* document why this method 'log' is empty */ }
  error(message: any, trace?: string, context?: string): any {/* document why this method 'log' is empty */ }
  warn(message: any, context?: string): any {/* document why this method 'log' is empty */ }
  debug(message: any, context?: string): any {/* document why this method 'log' is empty */ }
  verbose(message: any, context?: string): any {/* document why this method 'log' is empty */ }
}
