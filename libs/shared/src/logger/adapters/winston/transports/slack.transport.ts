import * as winston from 'winston';
import { errorReplacer } from '../../../common/utils';
import { InfrastructureConfig } from '../../../../common/types/configs';

const SlackHook = require('winston-slack-webhook-transport');

class SlackTransport {
  public static create(config: InfrastructureConfig) {
    return new SlackHook({
      webhookUrl: config.log.slack?.webhook_url,
      channel: '#' + config.log.slack?.channel,
      username: 'LoggerBot',
      format: winston.format.combine(
        winston.format.timestamp()
      ),
      formatter: (info) => {
        const attachments: any[] = [];
        const title = `[${info.timestamp}] [${info.level.toUpperCase()}]`;
        const ctx = info.data?.app + '/' + `${info.data?.sourceClass || info.data?.context}`;

        if (info.data?.error?.stack) {
          attachments.push({
            type: 'mrkdwn',
            text: '*Stack:* ' + info.data.error.stack
          });
        }

        if (info.data?.correlationId) {
          attachments.push({
            type: 'mrkdwn',
            text: '*Details:* ' + JSON.stringify({ correlationId: info.data.correlationId }, errorReplacer, 4)
          });
        }

        if (info.data?.props) {
          attachments.push({
            type: 'mrkdwn',
            text: '*Properties:* ' + JSON.stringify(info.data.props, errorReplacer, 4)
          });
        }

        return {
          text: title,
          blocks: [
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: '*' + title + '*',
                }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*[' + ctx + ']* ' + info.message,
              }
            }
          ],
          attachments
        };
      },
    });
  }
}

const SlackLogger = (config: InfrastructureConfig) => SlackTransport.create(config);

export default SlackLogger;
