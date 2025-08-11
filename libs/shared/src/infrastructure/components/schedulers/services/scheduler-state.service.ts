import { Injectable } from '@nestjs/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ScheduleTask } from '../common/types';

@Injectable()
export class SchedulerStateService {
    private readonly state: Map<string, ScheduleTask>;
    private readonly subjects: Map<string, BehaviorSubject<ScheduleTask>>;

    constructor() {
        this.state = new Map<string, ScheduleTask>();
        this.subjects = new Map<string, BehaviorSubject<ScheduleTask>>();
    }

    getObservable(key: string): Observable<ScheduleTask> {
        if (!this.subjects.has(key))
            this.subjects.set(key, new BehaviorSubject<ScheduleTask>(this.state.get(key)!));

        return this.subjects.get(key)?.asObservable()!;
    }

    set(key: string, task: ScheduleTask): void {
        this.state.set(key, task);

        if (this.subjects.has(key))
            this.subjects.get(key)?.next(task);
        else
            this.subjects.set(key, new BehaviorSubject<ScheduleTask>(task));
    }

    get(key: string): ScheduleTask {
        return this.state.get(key)!;
    }

    delete(key: string): boolean {
        if (this.state.has(key))
            this.state.delete(key);

        if (this.subjects.has(key))
            this.subjects.delete(key);

        return true;
    }

    size(): number {
        if (!this.state) return 0;
        return this.state.size;
    }

    keys(): string[] {
        if (!this.state) return [];
        return Array.from(this.state.keys());
    }

    values(): ScheduleTask[] {
        if (!this.state) return [];
        if (this.size() == 0) return [];
        return Array.from(this.state.values());
    }

    exist(name: string): boolean {
        if (!this.state) return false;
        return this.state.has(name);
    }
}