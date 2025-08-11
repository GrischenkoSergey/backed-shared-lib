import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { errorReplacer } from '../../../common/utils';
import { StorageConfig } from '../../../../common/types/configs';

const cluster = require('cluster');

const getConfigFileName = () => {
  let filename = 'local';
  if (process.env.NODE_ENV) { filename += `-${process.env.NODE_ENV}`; }
  if (process.env.NODE_APP_INSTANCE) { filename += `-${process.env.NODE_APP_INSTANCE}`; }

  if (cluster.isMaster) {
    filename += '-master';
  }

  return filename;
}

const fileLoggerFormat = winston.format.printf((log: any) => {
  const prefix = log.data?.label ? `[${log.data.label}]` : '';
  const stack = log.data.error?.stack ? log.data.error.stack : '';
  const message = log.message?.endsWith('.') ? log.message : log.message + '.';
  const ctx = log.data?.sourceClass || log.data?.context;

  return `${prefix + '-'} ${log.timestamp} ${log.level.toUpperCase()} ${ctx
    ? `[${log.data.app}/${ctx}]`
    : `[${log.data.app}]`
    } ${message
    }${log.data.durationMs !== undefined
      ? log.data.durationMs + 'ms'
      : ''
    }${stack ? `\n- ${stack}` : ''
    }${log.data.correlationId
      ? `\n- Details: ${JSON.stringify({ correlationId: log.data.correlationId }, errorReplacer, 4)}`
      : ''
    }${log.data?.props
      ? `\n- Props: ${JSON.stringify(log.data.props, errorReplacer, 4)}`
      : ''
    }\r\n`;
});

class FileTransport {
  public static create(config: StorageConfig) {
    return new DailyRotateFile({
      filename: getConfigFileName(),
      extension: ".log",
      dirname: config.logs,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: 2,
      format: winston.format.combine(
        winston.format.timestamp(),
        fileLoggerFormat
      )
    });
  }
}

const FileLogger = (config: StorageConfig) => FileTransport.create(config);

export default FileLogger;

