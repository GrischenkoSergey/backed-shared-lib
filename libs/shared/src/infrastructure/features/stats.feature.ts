import { ApiProperty, ApiSchema } from '@nestjs/swagger';

export const STATS_SERVICE = Symbol('STATS_SERVICE');

@ApiSchema({ name: "ServerStatsInfo", description: "Contains the information about the server process" })
export class ServerStatsInfo {
    @ApiProperty({
        description: 'The server date',
        type: String
    })
    date: string;

    @ApiProperty({
        description: 'The server time',
        type: String
    })
    time: string;

    @ApiProperty({
        description: 'The server timezone',
        type: String
    })
    timezone: string;

    @ApiProperty({
        description: 'The server time in ISO format',
        type: String
    })
    timestamp: string;

    @ApiProperty({
        description: 'The startup time of the server process',
        type: String
    })
    startedAt: string;

    @ApiProperty({
        description: 'The server status',
        type: String
    })
    restartStatus: string;

    @ApiProperty({
        description: 'The id of the server instance',
        type: String
    })
    instanceId: string;

    @ApiProperty({
        description: 'The CPU loading in percentages',
        type: String
    })
    cpuUsage: number;

    @ApiProperty({
        description: 'The id of the server worker',
        type: String
    })
    workerId: string;

    @ApiProperty({
        description: 'The server unique id',
        type: String
    })
    serverUniqueId: string;

    @ApiProperty({
        description: 'The server region',
        type: String
    })
    region: string;

    @ApiProperty({
        description: 'The memory consumption of the server process in bytes',
        type: 'object',
        properties: {
            name: {
                type: 'string',
                example: 'globalTotal'
            },
            value: {
                type: 'number',
                example: 67964796928
            }
        },
    })
    memory: { [key: string]: number };
}

export interface IStatistics {
    get startupTime();
    getStats(): Promise<ServerStatsInfo>;
    updateStats();
    addStats(stats: ServerStatsInfo);
    getAllStats(): ServerStatsInfo[];
}
