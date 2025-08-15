import { RateLimiterResult, RateLimiterParams } from './params';
import { RequireField } from '../common/require-field';

export const RATE_LIMITER_ASSERTER_TOKEN = Symbol.for(
    'ratelimiter:asserter',
);
export interface RateLimiterAsserter {
    assert(params: RequireField<RateLimiterParams, 'id'>): Promise<RateLimiterResult>;
}
