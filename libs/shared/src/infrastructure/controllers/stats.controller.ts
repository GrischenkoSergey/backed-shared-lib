import { Controller, Get, Inject, BadRequestException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_VERSION, InfrastructureConfig } from '../../common/types/configs';
import { STATS_SERVICE, ServerStatsInfo, IStatistics, RateLimiter } from '../features';
import { getRequestIPAndPath } from '../../common/helpers/core-utils';

@ApiTags('Statistics')
@Controller(`api/${API_VERSION}/server/stats`)
export class StatsController {
    constructor(
        @Inject(InfrastructureConfig) private readonly config: InfrastructureConfig,
        @Inject(STATS_SERVICE) private readonly statsService: IStatistics
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get server statistics' })
    @ApiOkResponse({ type: Object })
    @RateLimiter({
        getId: getRequestIPAndPath,
        points: 5,
        duration: 10
    })
    async getStats(): Promise<ServerStatsInfo[]> {
        if (!this.config.server_stats.enabled) {
            throw new BadRequestException('Server statistics is not enabled in the configuration.');
        }

        return this.statsService?.getAllStats();
    }
}