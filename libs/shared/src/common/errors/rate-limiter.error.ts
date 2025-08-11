import { LimiterInfo } from 'ratelimiter';

export class RateLimiterError extends Error {
    constructor(
        message: unknown,
        readonly limiterInfo: LimiterInfo,
    ) {
        super(JSON.stringify(message));
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
