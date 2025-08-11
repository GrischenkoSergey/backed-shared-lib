import * as moment from 'moment-timezone';
import { ExecutionType, ScheduleOptions, ScheduleTask } from './types';

export function validateTask(tasks: ScheduleTask[], type: ExecutionType, name: string, options: ScheduleOptions = {}): string {
    if (tasks.find(t => t.name === name)) {
        return `Task name '${name}' already registered`;
    }

    if (options.priority != undefined && options.priority >= 0) {
        if (tasks.find(t => t.options.priority === options.priority)) {
            return `Task name '${name}' priority '${options.priority}' already registered`;
        }
    }

    if (type === 'Cron') {
        if (!options?.cronTime) {
            return 'Cron tasks require a valid cronTime';
        }

        if (options.timeZone != undefined) {
            if (!moment.tz.names().includes(options.timeZone)) {
                return 'Cron tasks require a valid timeZone';
            }
        }
    }

    if (type === 'Interval') {
        if (options?.ms == undefined || options?.ms < 0) {
            return 'Interval tasks require a valid ms';
        }
    }

    if (type == 'Delay') {
        if (options?.ms == undefined || options?.ms < 0) {
            return 'Delay tasks require a valid ms';
        }
    }

    if (type == 'RunAt') {
        if (options?.runAt == undefined) {
            return 'RunAt tasks require a valid runAt';
        }

        if (options.runAt.getTime() < Date.now()) {
            return 'RunAt tasks require a future runAt date';
        }

        if (options.timeZone != undefined) {
            if (!moment.tz.names().includes(options.timeZone)) {
                return 'RunAt tasks require a valid timeZone';
            }
        }
    }

    return '';
}

export function fillTaskDefaults(task: ScheduleTask): ScheduleTask {
    if (!task) return task;

    if (task.options?.priority != undefined && task.options?.priority < 0) {
        task.options.priority = undefined;
    }

    if (task.type == 'RunAt') {
        if (task.options?.runAt != undefined) {
            const delayInMs: number = task.options.timeZone == undefined
                ? task.options.runAt.getTime() - Date.now()
                : moment(task.options.runAt).tz(task.options.timeZone).valueOf() - Date.now();

            task.options.ms = delayInMs != undefined && delayInMs >= 0
                ? delayInMs
                : 0;
        }
    }

    if (task.response != undefined) task.response = undefined;

    return task;
}
