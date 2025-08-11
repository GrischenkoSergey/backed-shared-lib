import { BackendError } from './backend.error';

export class RedisError extends BackendError {
    constructor(message: string, details?: any) {
        super(message);
        this.details = details;
    }
}
