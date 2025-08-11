import { BackendError } from './backend.error';

export class TransactionError extends BackendError {
    constructor(message: string, details?: any) {
        super(message);
        this.details = details;
    }
}
