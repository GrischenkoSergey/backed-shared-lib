import { ExecutionContext } from '@nestjs/common';
import { FactoryProvider, ModuleMetadata } from '@nestjs/common/interfaces';
import { LimiterInfo, LimiterOption } from 'ratelimiter';

export const RATELIMITER_DECORATOR_PARAMS_TOKEN = Symbol.for(
    'ratelimiter:params-decorator',
);
export type RateLimiterParams = Pick<LimiterOption, 'max' | 'duration'> & {
    createErrorBody?: CreateErrorBodyFn;
} & ({ getId: GetIdFn } | { id: string } | object);

export type GetIdFn = (context: ExecutionContext) => string | Promise<string>;

export type CreateErrorBodyFn = (limit: LimiterInfo) => unknown;

export const RATELIMITER_MODULE_PARAMS_TOKEN = Symbol.for('ratelimiter:params-module');
export type RateLimiterModuleParams = Partial<RateLimiterParams> &
    Pick<LimiterOption, 'db'>;

export interface RateLimiterModuleParamsAsync
    extends Pick<ModuleMetadata, 'imports' | 'providers'>,
    Pick<
        FactoryProvider<
            RateLimiterModuleParams | Promise<RateLimiterModuleParams>
        >,
        'useFactory' | 'inject'
    > { }