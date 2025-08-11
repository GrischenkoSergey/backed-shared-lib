export type ExecutionType = 'Cron' | 'Interval' | 'Delay' | 'RunAt';

export class ScheduleTask {
    type: ExecutionType;
    name: string;
    options: ScheduleOptions;
    context: any;
    fn?: any;
    object?: any;
    response?: any;
}

export interface ScheduleOptions {
    priority?: number;
    cronTime?: string;
    ms?: number;
    runAt?: Date;
    timeZone?: string;
}