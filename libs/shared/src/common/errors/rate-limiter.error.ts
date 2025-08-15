import { RateLimiterResult } from '../../infrastructure/components/redis/ratelimiter/params';

export class RateLimiterError extends Error {
    constructor(
        message: unknown,
        readonly limiterInfo: RateLimiterResult,
    ) {
        super(JSON.stringify(message));
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
