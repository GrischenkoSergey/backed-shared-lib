import { ExecutionContext } from '@nestjs/common';
import { FactoryProvider, ModuleMetadata } from '@nestjs/common/interfaces';
import { IRateLimiterOptions, IRateLimiterRedisOptions, RateLimiterRes } from 'rate-limiter-flexible';

export const RATELIMITER_DECORATOR_PARAMS_TOKEN = Symbol.for(
    'ratelimiter:params-decorator',
);

export type RateLimiterParams = Pick<IRateLimiterOptions, 'points' | 'duration'> & {
    createErrorBody?: CreateErrorBodyFn;
} & ({ getId: GetIdFn } | { id: string } | object);

export type GetIdFn = (context: ExecutionContext) => string | Promise<string>;

export type RateLimiterResult = Partial<RateLimiterRes> &
    Pick<RateLimiterParams, 'points'>;

export type CreateErrorBodyFn = (limit: RateLimiterResult) => unknown;

export const RATELIMITER_MODULE_PARAMS_TOKEN = Symbol.for('ratelimiter:params-module');

export type RateLimiterModuleParams = Partial<RateLimiterParams> &
    Pick<IRateLimiterRedisOptions, 'storeClient'>;

export interface RateLimiterModuleParamsAsync
    extends Pick<ModuleMetadata, 'imports' | 'providers'>,
    Pick<
        FactoryProvider<
            RateLimiterModuleParams | Promise<RateLimiterModuleParams>
        >,
        'useFactory' | 'inject'
    > { }