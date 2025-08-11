import { HttpStatus } from '@nestjs/common';
import { BackendError } from './backend.error';

export class UnexpectedRuntimeError extends BackendError {
    constructor (message: string) {
        super(message, { code: HttpStatus.UNPROCESSABLE_ENTITY });
    }
}
