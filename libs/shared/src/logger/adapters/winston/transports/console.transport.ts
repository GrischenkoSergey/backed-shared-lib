import * as winston from 'winston';
import { LogLevel } from '../../../common/interfaces';
import { errorReplacer } from '../../../common/utils';

enum LogColors {
  red = '\x1b[31m',
  green = '\x1b[32m',
  yellow = '\x1b[33m',
  blue = '\x1b[34m',
  magenta = '\x1b[35m',
  cyan = '\x1b[36m',
  pink = '\x1b[38;5;206m',
}

class ConsoleTransport {
  public static createColorize() {
    return new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((log: any) => {
          const color = this.mapLogLevelColor(log.data?.level as LogLevel);
          const prefix = log.data?.label ? `[${log.data.label}]` : '';
          const stack = log.data?.error?.stack ? log.data.error.stack : '';
          const message = log.message?.endsWith('.') ? log.message : log.message + '.';
          const ctx = log.data?.sourceClass || log.data?.context;

          return `${this.colorize(color, prefix + '-')} ${log.timestamp} ${this.colorize(color, log.level.toUpperCase())} ${ctx
            ? this.colorize(LogColors.cyan, `[${log.data.app}/${ctx}]`)
            : this.colorize(LogColors.cyan, `[${log.data.app}]`)
            } ${this.colorize(
              color,
              message /*+ (error ? ' ' + error : '')*/,
            )}${log.data?.durationMs !== undefined
              ? this.colorize(color, ' +' + log.data.durationMs + 'ms')
              : ''
            }${stack ? this.colorize(color, `\n- ${stack}`) : ''
            }${log.data?.correlationId
              ? `\n- Details: ${JSON.stringify({ correlationId: log.data.correlationId }, errorReplacer, 4)}`
              : ''
            }${log.data?.props
              ? `\n- Props: ${JSON.stringify(log.data.props, errorReplacer, 4)}`
              : ''
            }`;
        }),
      ),
    });
  }

  private static colorize(color: LogColors, message: string): string {
    return `${color}${message}\x1b[0m`;
  }

  private static mapLogLevelColor(level: LogLevel): LogColors {
    switch (level) {
      case LogLevel.Debug:
        return LogColors.blue;
      case LogLevel.Info:
        return LogColors.green;
      case LogLevel.Warn:
        return LogColors.yellow;
      case LogLevel.Error:
        return LogColors.red;
      default:
        return LogColors.cyan;
    }
  }
}

const ConsoleLogger = () => ConsoleTransport.createColorize();

export default ConsoleLogger;
