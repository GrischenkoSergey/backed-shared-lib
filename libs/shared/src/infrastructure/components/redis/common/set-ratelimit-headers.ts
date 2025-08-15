import { ServerResponse } from 'http';
import { RateLimiterResult } from '../ratelimiter/params';

export function setRateLimitHeaders(response: ServerResponse, limiterInfo: RateLimiterResult) {
    const prevRemaining = response.getHeader('X-RateLimit-Remaining');

    if (typeof prevRemaining === 'number' && prevRemaining < limiterInfo.remainingPoints!) {
        return;
    }

    response.setHeader('X-RateLimit-Limit', limiterInfo.points!);
    response.setHeader('X-RateLimit-Remaining', limiterInfo.remainingPoints!);
    response.setHeader('X-RateLimit-Reset', '' + (new Date(Date.now() + limiterInfo.msBeforeNext!)).toLocaleString());
}
