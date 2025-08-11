import { ServerResponse } from 'http';
import {
    CanActivate,
    ClassProvider,
    ExecutionContext,
    Inject,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import {
    RATE_LIMITER_ASSERTER_TOKEN,
    RateLimiterAsserter
} from './asserter.interface';
import { RateLimiterError } from '../../../../common/errors/rate-limiter.error';
import {
    RATELIMITER_DECORATOR_PARAMS_TOKEN,
    RATELIMITER_MODULE_PARAMS_TOKEN,
    RateLimiterModuleParams,
    RateLimiterParams,
} from './params';
import { TooManyRequestsError } from '../../../../common/errors/too-many-requests.error';
import { setRateLimitHeaders } from '../common/set-ratelimit-headers';

@Injectable()
export class RateLimiterGuard implements CanActivate {
    constructor(
        @Inject(RATELIMITER_MODULE_PARAMS_TOKEN) private readonly defaultParams: RateLimiterModuleParams,
        @Inject(RATE_LIMITER_ASSERTER_TOKEN) private readonly asserter: RateLimiterAsserter,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext) {
        const paramsList = this.reflector.getAllAndOverride<
            RateLimiterParams[] | [false] | undefined
        >(RATELIMITER_DECORATOR_PARAMS_TOKEN, [context.getHandler(), context.getClass()]);

        if (isTurnedOff(paramsList)) return true;

        const response = context.switchToHttp().getResponse();
        const nativeResponse: ServerResponse = response.raw || response;

        for (const param of paramsList || [{}]) {
            await this.checkSingleParam(param as RateLimiterParams, context, nativeResponse);
        }

        return true;
    }

    private async checkSingleParam(params: RateLimiterParams, context: ExecutionContext, response: ServerResponse) {
        const id = await this.getId(params, context);

        if (!id) return;

        const { max, duration, createErrorBody } = params;

        try {
            const limit = await this.asserter.assert({
                id,
                max,
                duration,
                createErrorBody,
            });

            setRateLimitHeaders(response, limit);
        } catch (error) {
            if (error instanceof RateLimiterError) {
                response.setHeader(
                    'Retry-After',
                    (error.limiterInfo.reset - Date.now() / 1000) | 0,
                );
                setRateLimitHeaders(response, error.limiterInfo);

                throw new TooManyRequestsError(JSON.parse(error.message));
            } else {
                throw error;
            }
        }
    }

    private async getId(params: RateLimiterParams, context: ExecutionContext) {
        let id: string | undefined = undefined;
        try {
            if ('id' in params) {
                id = params.id;
            } else if ('getId' in params) {
                id = await params.getId(context);
            } else if ('id' in this.defaultParams) {
                id = this.defaultParams.id;
            } else if ('getId' in this.defaultParams && this.defaultParams.getId) {
                id = await this.defaultParams.getId(context);
            }
        } catch (error) {
            throw new InternalServerErrorException(
                'Can not get id for rate limiter',
                String(error),
            );
        }
        return id;
    }
}

function isTurnedOff(params: RateLimiterParams[] | [false] | undefined): params is [false] {
    return !!params && params.length === 1 && params[0] === false;
}

export const RateLimiterGuardProvider: ClassProvider<CanActivate> = {
    provide: APP_GUARD,
    useClass: RateLimiterGuard,
};
