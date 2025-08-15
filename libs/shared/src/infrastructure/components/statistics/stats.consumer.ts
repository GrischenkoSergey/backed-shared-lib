import { Inject } from '@nestjs/common';
import {
    Processor,
    WorkerHost,
    QueueEventsHost,
    QueueEventsListener,
    OnQueueEvent,
    InjectQueue
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { StatsBullService } from './stats-bull.service';

@QueueEventsListener('stats')
export class StatsEvents extends QueueEventsHost {
    constructor(
        @InjectQueue('stats') private readonly statsQueue: Queue,
        @Inject(StatsBullService) private readonly statsService: StatsBullService
    ) {
        super();
    }

    @OnQueueEvent('completed')
    async onCompleted(args: { jobId: string; prev?: string, returnvalue: string }, id: string) {
        const job = await this.statsQueue.getJob(args.jobId);

        if (job.data?.properties?.sentTime) {
            const sentTime = new Date(job.data.properties.sentTime);

            if (job.data.properties.sentTime && (sentTime >= this.statsService.startupTime)) {
                this.statsService.addStats(job.data.properties.stats);
            }
        }

        return {};
    }
}

@Processor('stats')
export class StatsConsumer extends WorkerHost {
    async process(job: Job<any, any, string>): Promise<any> {
        // dummy function
        return {};
    }
}
