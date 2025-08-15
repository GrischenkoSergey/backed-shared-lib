import { ClassProvider, Inject, InternalServerErrorException } from '@nestjs/common';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { RATE_LIMITER_ASSERTER_TOKEN, RateLimiterAsserter } from './asserter.interface';
import { RateLimiterError } from '../../../../common/errors/rate-limiter.error';
import { RATELIMITER_MODULE_PARAMS_TOKEN, RateLimiterModuleParams, RateLimiterParams, RateLimiterResult } from './params';
import { defaultErrorBodyCreator } from '../common/default-error-body-creator';
import { RequireField } from '../common/require-field';

export class RateLimiterAsserterImpl implements RateLimiterAsserter {
    private readonly limiters = new Map<string, RateLimiterRedis>();

    constructor(
        @Inject(RATELIMITER_MODULE_PARAMS_TOKEN) private readonly defaultParams: RateLimiterModuleParams
    ) {
    }

    async assert(params: RequireField<RateLimiterParams, 'id'>): Promise<RateLimiterResult> {
        let limiter: RateLimiterRedis;

        try {
            if (!this.limiters.has(params.id)) {
                let _limiter;

                if (this.defaultParams.storeClient) {
                    _limiter = new RateLimiterRedis({
                        keyPrefix: params.id,
                        storeClient: this.defaultParams.storeClient,
                        points: params.points || this.defaultParams.points,
                        duration: params.duration || this.defaultParams.duration,
                        blockDuration: params.duration,
                        execEvenly: false,
                        insuranceLimiter: new RateLimiterMemory({
                            points: params.points || this.defaultParams.points,
                            duration: params.duration || this.defaultParams.duration,
                            blockDuration: params.duration
                        })
                    });
                } else {
                    _limiter = new RateLimiterMemory({
                        keyPrefix: params.id,
                        points: params.points || this.defaultParams.points,
                        duration: params.duration || this.defaultParams.duration,
                        blockDuration: params.duration,
                        execEvenly: false,
                    });
                }

                this.limiters.set(params.id, _limiter);
            }

            limiter = this.limiters.get(params.id)!;
        } catch (error) {
            throw new InternalServerErrorException('Cannot create rate limiter', String(error));
        }

        const limiterResult = await limiter.consume(params.id)
            .catch(async err => {
                const limiterInfo: RateLimiterResult = {
                    consumedPoints: err.consumedPoints,
                    isFirstInDuration: err.isFirstInDuration,
                    msBeforeNext: err.msBeforeNext,
                    remainingPoints: err.remainingPoints,
                    points: params.points
                };
                const body = (params.createErrorBody || this.defaultParams.createErrorBody || defaultErrorBodyCreator)(limiterInfo);

                throw new RateLimiterError(body, limiterInfo);
            });

        return {
            consumedPoints: limiterResult.consumedPoints,
            isFirstInDuration: limiterResult.isFirstInDuration,
            msBeforeNext: limiterResult.msBeforeNext,
            remainingPoints: limiterResult.remainingPoints,
            points: params.points
        };
    }
}

export const RateLimiterAsserterProvider: ClassProvider<RateLimiterAsserter> = {
    provide: RATE_LIMITER_ASSERTER_TOKEN,
    useClass: RateLimiterAsserterImpl,
};
