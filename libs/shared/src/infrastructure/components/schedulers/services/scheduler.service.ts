import { Injectable } from '@nestjs/common';
import { CronJob } from 'cron';
import { isObservable, Observable } from 'rxjs';
import { fillTaskDefaults, /*getInitialDecoratorsTasks,*/ validateTask } from '../common/utils';
import { IScheduler } from '../../../features/scheduler.feature';
import { ScheduleTask } from '../common/types';
import { SchedulerStateService } from './scheduler-state.service';

@Injectable()
export class SchedulerService implements IScheduler {
    private readonly _contexts: Map<string, any>;

    public get contexts(): any[] {
        if (!this._contexts) {
            return [];
        }

        if (this._contexts.size == 0) {
            return [];
        }

        return Array.from(this._contexts.values());
    }

    public set context(context: any) {
        if (!isClass(context.constructor)) {
            throw new Error('Context must be a class');
        }

        this._contexts.set(context.constructor.name, context);
    }

    public get tasks(): ScheduleTask[] {
        return this.state.values();
    }

    constructor(private readonly state: SchedulerStateService) {
        this._contexts = new Map<string, any>();
    }

    public addTasks(tasks: ScheduleTask[] | ScheduleTask): boolean {
        tasks = Array.isArray(tasks) ? tasks : [tasks];

        if (!tasks || tasks.length == 0) {
            throw new Error('Tasks are required');
        }

        for (const task of tasks) {
            const val_error: string = validateTask(this.state.values(), task.type, task.name, task.options);

            if (val_error) {
                throw new Error(val_error);
            }

            const filled_task: ScheduleTask = fillTaskDefaults(task);

            if (this.state.exist(filled_task.name)) {
                this.stopTasks(filled_task.name);
            }

            this.state.set(filled_task.name, filled_task);
            this.startTasks(filled_task.name);
        }

        return true;
    }

    public removeTasks(names: string[] | string): boolean {
        names = Array.isArray(names) ? names : [names];

        if (!names || names.length == 0) {
            throw new Error('Names are required');
        }

        for (const task of getTasksByNames.bind(this)(names)) {
            const stop_task: boolean = this.stopTasks(task.name);

            if (!stop_task) {
                throw new Error(`Unnable to stop task ${task.name}`);
            }

            this.state.delete(task.name);
        }

        return true;
    }

    public stopTasks(names: string[] | string): boolean {
        names = Array.isArray(names) ? names : [names];

        if (!names || names.length == 0) {
            throw new Error('Names are required');
        }

        for (const task of getTasksByNames.bind(this)(names)) {
            if (this.state.get(task.name).type === 'Cron')
                this.state.get(task.name).object.stop();

            if (this.state.get(task.name).type === 'Interval')
                clearInterval(this.state.get(task.name).object);

            if (this.state.get(task.name).type === 'Delay' || this.state.get(task.name).type === 'RunAt')
                clearTimeout(this.state.get(task.name).object);

            if (this.state.get(task.name).response)
                this.state.get(task.name).response = undefined;
        }

        return true;
    }

    public startTasks(names: string[] | string): boolean {
        names = Array.isArray(names) ? names : [names];

        if (!names || names.length == 0) {
            throw new Error('Names are required');
        }

        for (const task of getTasksByNames.bind(this)(names)) {
            if (this.state.get(task.name).type === 'Cron') {
                this.state.get(task.name).object = new CronJob(
                    this.state.get(task.name).options.cronTime!, // CronTime
                    cronJobCallback.bind(
                        this._contexts.get(this.state.get(task.name).context.constructor.name),
                        this.state.get(task.name),
                        this.state,
                        this._contexts.get(this.state.get(task.name).context.constructor.name)
                    ), // OnTick
                    null, // OnComplete
                    false, // Start,
                    this.state.get(task.name).options?.timeZone
                        ? this.state.get(task.name).options.timeZone
                        : null, // Timezone
                );
            }

            if (this.state.get(task.name).type === 'Interval') {
                this.state.get(task.name).object = setInterval(
                    intervalJobCallback.bind(
                        this._contexts.get(this.state.get(task.name).context.constructor.name),
                        this.state.get(task.name),
                        this.state,
                        this._contexts.get(this.state.get(task.name).context.constructor.name),
                    ),
                    this.state.get(task.name).options.ms
                );
            }

            if (this.state.get(task.name).type === 'Delay' || this.state.get(task.name).type === 'RunAt') {
                this.state.get(task.name).object = setTimeout(
                    delayJobCallback.bind(
                        this._contexts.get(this.state.get(task.name).context.constructor.name),
                        this.state.get(task.name),
                        this.state,
                        this._contexts.get(this.state.get(task.name).context.constructor.name),
                    ),
                    this.state.get(task.name).options.ms
                );
            }

            if (this.state.get(task.name).type === 'Cron') {
                this.state.get(task.name).object.start();
            }
        }

        return true;
    }

    public restartTasks(names: string[] | string): boolean {
        names = Array.isArray(names) ? names : [names];

        if (!names || names.length == 0) {
            throw new Error('Names are required');
        }

        for (const task of getTasksByNames.bind(this)(names)) {
            this.stopTasks(task.name);
            this.startTasks(task.name);
        }

        return true;
    }

    public subscribeToTask(name: string): Observable<ScheduleTask> {
        return this.state.getObservable(name);
    }
}

async function cronJobCallback(task: ScheduleTask, state: SchedulerStateService, context: any): Promise<void> {
    try {
        let response: any;

        if (!state.get(task.name).fn) {
            response = null;
        } else if (context) {
            response = await state.get(task.name).fn.bind(context)();
        } else {
            response = await state.get(task.name).fn();
        }

        if (response != undefined) {
            const current_task: ScheduleTask = state.get(task.name);

            current_task.response = await manageTaskSubscription(state.get(task.name), response);
            state.set(task.name, current_task);
        }
    } catch (error) {
        console.error(`[Scheduler] Cron '${task.name}' execution error: ${error}`);
    }
}

async function intervalJobCallback(task: ScheduleTask, state: SchedulerStateService, context: any): Promise<void> {
    try {
        let response: any;

        if (!state.get(task.name).fn) {
            response = null;
        } else if (context) {
            response = await state.get(task.name).fn.bind(context)();
        } else {
            response = await state.get(task.name).fn();
        }

        if (response != undefined) {
            const current_task: ScheduleTask = state.get(task.name);

            current_task.response = await manageTaskSubscription(state.get(task.name), response);
            state.set(task.name, current_task);
        }
    } catch (error) {
        console.error(`[Scheduler] Interval '${task.name}' execution error: ${error}`);
    }
}

async function delayJobCallback(task: ScheduleTask, state: SchedulerStateService, context: any): Promise<void> {
    try {
        let response: any;

        if (!state.get(task.name).fn) {
            response = null;
        } else if (context) {
            response = await state.get(task.name).fn.bind(context)();
        } else {
            response = await state.get(task.name).fn();
        }

        if (response != undefined) {
            const current_task: ScheduleTask = state.get(task.name);

            current_task.response = await manageTaskSubscription(state.get(task.name), response);
            state.set(task.name, current_task);
        }
    } catch (error) {
        console.error(`[Scheduler] ${task.type == 'RunAt' ? 'RunAt' : 'Delay'} '${task.name}' execution error: ${error}`);
    }
}

function getTasksByNames(names: string[]): ScheduleTask[] {
    const tasks: ScheduleTask[] = [];

    for (const name of names) {
        const exist_task: ScheduleTask = this.state.values().find(t => t.name === name);

        if (!exist_task)
            throw new Error(`Task ${name} not found`);

        tasks.push(exist_task);
    }

    return tasks;
}

function isFunction(variable: any): boolean {
    return typeof variable === 'function' && !/^class\s/.test(variable.toString());
}

function isClass(variable: any): boolean {
    return typeof variable === 'function' && /^class\s/.test(variable.toString());
}

async function resolveValue(value: any): Promise<any> {
    if (!value) return null;

    if (isFunction(value)) {
        return await resolveValue(value());
    }

    if (value instanceof Promise) {
        const resolved = await value;
        return await resolveValue(resolved);
    }

    if (isObservable(value)) {
        const resolved: any = await new Promise<any>((resolve) => {
            value.subscribe({
                next: (data: any) => {
                    resolve(data);
                },
                error: () => {
                    resolve(null);
                }
            })
        });
        return await resolveValue(resolved);
    }

    return value;
}

async function manageTaskSubscription(task: ScheduleTask, response: any): Promise<void> {
    if (!task || !response) {
        return;
    }

    if (isObservable(response)) {
        return await new Promise<any>((resolve) => {
            response.subscribe({
                next: async (value: any) => {
                    const resolved = await resolveValue(value);
                    resolve(resolved);
                },
                error: (err) => {
                    console.error(`[Scheduler] Task '${task.name}' subscription error: ${err}`);
                    resolve(undefined);
                },
            });
        });
    }

    if (response instanceof Promise) {
        return await resolveValue(response);
    }

    if (isFunction(response)) {
        return await resolveValue(await response());
    }

    return response;
}
