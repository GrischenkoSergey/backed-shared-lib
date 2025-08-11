import { HttpStatus } from '@nestjs/common';
import { BackendError } from './backend.error';
import { CustomErrorCodes } from '../types/errors';

export class UrlNotImplementedError extends BackendError {
    constructor(message: string) {
        super(
            message,
            {
                code: HttpStatus.NOT_IMPLEMENTED,
                name: 'UrlNotImplementedError',
                errorCode: CustomErrorCodes.UrlNotImplementedError
            }
        );
    }
}
