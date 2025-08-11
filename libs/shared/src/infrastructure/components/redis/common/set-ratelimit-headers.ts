import { ServerResponse } from 'http';
import { LimiterInfo } from 'ratelimiter';

export function setRateLimitHeaders(response: ServerResponse, limiterInfo: LimiterInfo) {
    const prevRemaining = response.getHeader('X-RateLimit-Remaining');
    if (
        typeof prevRemaining === 'number' &&
        prevRemaining < limiterInfo.remaining
    )
        return;

    response.setHeader('X-RateLimit-Limit', limiterInfo.total);
    response.setHeader('X-RateLimit-Remaining', limiterInfo.remaining - 1);
    response.setHeader('X-RateLimit-Reset', limiterInfo.reset);
}
