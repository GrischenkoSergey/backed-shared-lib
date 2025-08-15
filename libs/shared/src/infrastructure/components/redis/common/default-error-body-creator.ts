import { CreateErrorBodyFn, RateLimiterResult } from '../ratelimiter/params';

export const defaultErrorBodyCreator: CreateErrorBodyFn = (limit: RateLimiterResult) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ms = require('ms');
    return 'Rate limit exceeded, retry in ' + ms(limit.msBeforeNext! | 0, { long: true });
};