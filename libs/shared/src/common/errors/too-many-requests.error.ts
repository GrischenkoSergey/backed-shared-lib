import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsError extends HttpException {
    constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message?: string | object | any,
        error = 'Too Many Requests',
    ) {
        super(
            HttpException.createBody(message, error, HttpStatus.TOO_MANY_REQUESTS),
            HttpStatus.TOO_MANY_REQUESTS,
        );
    }
}
