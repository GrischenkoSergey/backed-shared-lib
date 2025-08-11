import * as express from 'express';
import { HttpStatus } from '@nestjs/common';
import { BackendError } from './backend.error';
import { CustomErrorCodes } from '../types/errors';

export class ServerError extends BackendError {
    constructor(message: string) {
        super(
            message,
            {
                code: HttpStatus.BAD_REQUEST,
                name: 'ServerError',
                errorCode: CustomErrorCodes.ServerError
            }
        );
    }

    static composeResponse(res: express.Response, message: string, name?: string, code?: string, status = 400) {
        const error = new ServerError(message);
        error.statusCode = status;

        if (name) { error.name = name; }
        if (code) { error['errorCode'] = code; }

        res.status(status).json(error).end();

        return true;
    }
}
