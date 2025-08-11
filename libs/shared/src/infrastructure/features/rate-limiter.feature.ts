import { SetMetadata } from '@nestjs/common';
import { RATELIMITER_DECORATOR_PARAMS_TOKEN, RateLimiterParams } from '../components/redis/ratelimiter/params';

export function RateLimiter(...params: RateLimiterParams[] | [false]) {
    return SetMetadata(RATELIMITER_DECORATOR_PARAMS_TOKEN, params);
}