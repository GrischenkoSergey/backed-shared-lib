import { ScheduleTask } from '../components/schedulers/common/types';

export const SCHEDULER_SERVICE = Symbol('SCHEDULER_SERVICE');

export interface IScheduler {
    get contexts(): any[];
    set context(context: any);
    get tasks(): ScheduleTask[];
    addTasks(tasks: ScheduleTask[] | ScheduleTask): boolean;
    removeTasks(names: string[] | string): boolean;
    stopTasks(names: string[] | string): boolean;
    startTasks(names: string[] | string): boolean;
    restartTasks(names: string[] | string): boolean;
}
