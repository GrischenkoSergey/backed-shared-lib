import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { of } from 'rxjs';
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq'
import { AppEvents, WorkerStartedEvent } from '../../../common/types/events';
import { IStatistics, ServerStatsInfo } from '../../features/stats.feature';
import { SchedulerService } from '../schedulers/services/scheduler.service';
import { SchedulerContext } from '../schedulers/common/context';
import { SCHEDULER_INTERVALS_MS, ServerMessageName } from '../../common/types';
import { cpuUsage } from '../../../common/helpers/core-utils';
import { SettingsConfig } from '../../../common/types/configs';
import { JOB_STALLED_PERIOD } from '../../../common/constants';

@Injectable()
export class StatsService extends SchedulerContext implements IStatistics {
    private cpuLoad;
    private nodeHeapUsedMin = 0;
    private nodeHeapUsedMax = 0;
    private restartCode: number;
    private restartSignal: string;
    private readonly statsList = new Map<string, ServerStatsInfo>();

    public STARTUP_TIME: Date;
    public RESTART_TIME: Date;
    public RESTART_STATUS = 'Ready';
    public UNIQUE_ID = '';
    public WORKER_ID = '';

    constructor(
        @Inject(SchedulerService) private readonly schedulerService: SchedulerService,
        @Inject(SettingsConfig) private readonly config: SettingsConfig,
        @InjectQueue('stats') private readonly statsQueue: Queue
    ) {
        super(schedulerService);

        this.config = config;
        this.schedulerService = schedulerService

        this.STARTUP_TIME = new Date();
        this.RESTART_TIME = this.STARTUP_TIME;
        this.UNIQUE_ID = uuidv4().split('-')[4] + '-0';
        this.WORKER_ID = uuidv4().split('-')[4] + '-' + process.pid;

        this.schedulerService.addTasks([
            {
                type: 'Interval',
                name: 'intervals_cpu_load',
                options: { ms: SCHEDULER_INTERVALS_MS.CPU_LOAD },
                context: this,
                fn: async () => {
                    this.cpuLoad = cpuUsage(this.cpuLoad);
                    return of(true);
                }
            },
            {
                type: 'Interval',
                name: 'intervals_sync_stats',
                options: { ms: SCHEDULER_INTERVALS_MS.SERVER_STATS },
                context: this,
                fn: async () => {
                    const stats = await this.getStats();
                    const job = await this.statsQueue.add(
                        'stats_' + process.pid,
                        {
                            messageType: ServerMessageName.SERVER_STATS,
                            properties: {
                                sentTime: new Date(),
                                stats
                            },
                        },
                        {
                            backoff: {
                                delay: 5000,
                                type: 'fixed'
                            },
                            attempts: 10,
                            removeOnComplete: { age: 60 },
                            removeOnFail: true
                        }
                    );

                    return job.id;
                }
            }
        ]);
    }

    @OnEvent(AppEvents.WorkerStarted, { async: true })
    public handleWorkerStartedEvent(payload: WorkerStartedEvent) {
        if (payload.bootSettings) {
            const settings = payload.bootSettings;

            this.STARTUP_TIME = settings.startupTime ? new Date(settings.startupTime) : new Date();
            this.UNIQUE_ID = settings.uniqueId ? settings.uniqueId : this.UNIQUE_ID;

            this.statsList.clear();

            this.restartCode = settings.code;
            this.restartSignal = settings.signal;

            this.updateStats();
        }
    }

    public get startupTime() {
        return this.STARTUP_TIME;
    }

    public async getStats(): Promise<ServerStatsInfo> {
        const currentDate: Date = new Date();
        const timeOffset = -currentDate.getTimezoneOffset();
        const memUsage = process.memoryUsage();

        const heapUsed = memUsage.heapUsed;

        if (this.nodeHeapUsedMin === 0 || this.nodeHeapUsedMin > heapUsed) {
            this.nodeHeapUsedMin = heapUsed;
        }

        if (this.nodeHeapUsedMax < heapUsed) {
            this.nodeHeapUsedMax = heapUsed;
        }

        const data: ServerStatsInfo = {
            serverUniqueId: this.config.project_unique_id,
            timestamp: currentDate.toISOString(),
            date: currentDate.toLocaleDateString(),
            time: currentDate.toLocaleTimeString(),
            timezone: 'UTC' + ((timeOffset >= 0 ? '+' : '-') + this.divmod(timeOffset, 60)[0] + ':' + timeOffset % 60),
            startedAt: this.RESTART_TIME.toISOString(),
            restartStatus: this.RESTART_STATUS,
            region: this.config.region,
            workerId: this.WORKER_ID,
            instanceId: this.UNIQUE_ID,
            cpuUsage: this.cpuLoad ? Math.round(this.cpuLoad.percent) : 0,
            memory: {
                globalTotal: os.totalmem(),
                globalFree: os.freemem(),
                nodeRSS: memUsage.rss,
                nodeHeapTotal: memUsage.heapTotal,
                nodeHeapUsed: memUsage.heapUsed,
                nodeExternal: memUsage.external,
                nodeHeapUsedMin: this.nodeHeapUsedMin,
                nodeHeapUsedMax: this.nodeHeapUsedMax
            },
        };

        return data;
    }

    public async updateStats() {
        this.statsList.set(this.WORKER_ID, await this.getStats());
    }

    public addStats(stats: ServerStatsInfo) {
        if (stats.workerId) {
            this.statsList.set(stats.workerId, stats);

            const now = new Date();
            const stalledEntries: string[] = [];

            this.statsList.forEach((val, key) => {
                const timestamp = new Date(val.timestamp);
                const ellapsedTime = now.getTime() - timestamp.getTime();

                if (ellapsedTime > JOB_STALLED_PERIOD) {
                    stalledEntries.push(key);
                }
            });

            stalledEntries.forEach(key => {
                this.statsList.delete(key);
            });
        }
    }

    public getAllStats(): ServerStatsInfo[] {
        return [...this.statsList.values()];
    }

    private divmod(x: number, y: number) {
        const div = Math.trunc(x / y);
        const rem = x % y;

        return [div, rem];
    }

}
