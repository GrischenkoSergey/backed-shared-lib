import { Controller, Get, Inject, BadRequestException } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiTooManyRequestsResponse,
    ApiBadRequestResponse
} from '@nestjs/swagger';
import { API_VERSION, InfrastructureConfig, ProblemDetail } from '../../common/types';
import { STATS_SERVICE, ServerStatsInfo, IStatistics, RateLimiter } from '../features';
import { getRequestIPAndPath } from '../../common/helpers/core-utils';

@ApiTags('Statistics')
@Controller(`api/${API_VERSION}/server/stats`)
export class StatsController {
    constructor(
        @Inject(InfrastructureConfig) private readonly config: InfrastructureConfig,
        @Inject(STATS_SERVICE) private readonly statsService: IStatistics
    ) { }

    @ApiOperation({
        summary: 'Get server statistics'
    })
    @ApiOkResponse({
        type: ServerStatsInfo,
        description: "Returns the server statistics",
        isArray: true,
    })
    @ApiTooManyRequestsResponse({
        type: ProblemDetail,
        description: "Too many requests error"
    })
    @ApiBadRequestResponse({
        type: ProblemDetail,
        description: "Occures when the server statistics is not enabled in the configuration"
    })
    @RateLimiter({
        getId: getRequestIPAndPath,
        points: 5,
        duration: 10
    })
    @Get()
    async getStats(): Promise<ServerStatsInfo[]> {
        if (!this.config.server_stats.enabled) {
            throw new BadRequestException('Server statistics is not enabled in the configuration.');
        }

        return this.statsService?.getAllStats();
    }
}