
export const STATS_SERVICE = Symbol('STATS_SERVICE');

export interface ServerStatsInfo {
    date: string;
    time: string;
    timezone: string;
    timestamp: string;
    startedAt: string;
    restartStatus: string;
    instanceId: string;
    cpuUsage: number;
    workerId: string;
    serverUniqueId: string;
    region: string;
    memory: { [key: string]: number };
}

export interface IStatistics {
    get startupTime();
    getStats(): Promise<ServerStatsInfo>;
    updateStats();
    addStats(stats: ServerStatsInfo);
    getAllStats(): ServerStatsInfo[];
}
