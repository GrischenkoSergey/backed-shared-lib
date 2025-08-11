import { INestApplication } from '@nestjs/common';
import { BootMessage } from '../types/common-types';

export enum AppEvents {
    WorkerStarted = 'worker.started',
}

export class WorkerStartedEvent {
    constructor(
        public readonly app: INestApplication,
        public readonly bootSettings?: BootMessage | null
    ) { }
}