import { LimiterInfo } from 'ratelimiter';
import { CreateErrorBodyFn } from '../ratelimiter/params';

export const defaultErrorBodyCreator: CreateErrorBodyFn = (
    limit: LimiterInfo,
) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ms = require('ms');
    const delta = (limit.reset * 1000 - Date.now()) | 0;
    return 'Rate limit exceeded, retry in ' + ms(delta, { long: true });
};