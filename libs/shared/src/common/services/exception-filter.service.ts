import * as _ from 'lodash';
import { Request, Response } from 'express';
import { Inject, Catch, ArgumentsHost, HttpStatus, ExceptionFilter, HttpException } from '@nestjs/common';
import Logger, { LoggerKey } from '../../logger/common/interfaces';
import { RateLimiterError, TooManyRequestsError } from '../errors/';
import { ProblemDetail, ExceptionResponse } from '../types';
import { setRateLimitHeaders } from '../../infrastructure/components/redis/common/set-ratelimit-headers';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    constructor(
        @Inject(LoggerKey) private readonly logger: Logger,
    ) { }

    catch(_exception: any, _host: ArgumentsHost): void {
        const ctx = _host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const instance = `${_.toUpper(request.method)} ${request.url}`;

        if (_exception instanceof RateLimiterError) {
            setRateLimitHeaders(response, _exception.limiterInfo);
            response.setHeader('Retry-After', (_exception.limiterInfo.msBeforeNext! / 1000) | 0);

            _exception = new TooManyRequestsError(JSON.parse(_exception.message));
        }

        let status: number = HttpStatus.INTERNAL_SERVER_ERROR;

        let message, details;

        if (_exception instanceof HttpException) {
            status = _exception.getStatus();

            const exceptionResponse = this.getErrorMessage(_exception.getResponse(), HttpStatus[status]);

            message = exceptionResponse.message;
            details = exceptionResponse.detail;
        } else {
            message = _exception.message;
            status = _exception.statusCode || status;
            details = {
                ..._exception.details,
                errorCode: _exception.errorCode,
                statusCode: _exception.statusCode
            };

            if (_exception.details?.name) {
                details.name = _exception.details.name;
            } else {
                details.name = _exception.name;
            }
        }

        const error: ProblemDetail = {
            status,
            instance,
            code: `${this.getCode(HttpStatus[status])}`,
            message,
            details,
        };

        this.logger.error(message, { error: _exception, sourceClass: this.constructor.name, props: details });

        // this.metricsService?.counter('error_middleware_total', { 'status': status.toString() }, 1);

        response
            .type(PROBLEM_CONTENT_TYPE)
            .status(status)
            .json({ error });
    }

    private getErrorMessage(exceptionResponse: ExceptionResponse | string, httpStatus: string): ExceptionResponse {
        let message;
        let detail;

        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        } else if (_.isArray(exceptionResponse.message)) {
            message = exceptionResponse.error;
            detail = _.map(exceptionResponse.message, (_message) => ({ message: _message }));
        } else {
            message = exceptionResponse.message;
            detail = exceptionResponse.error;
        }

        return {
            message: message || _.startCase(_.toLower(httpStatus)),
            detail,
        };
    };

    private getCode(exResponse: ExceptionResponse | string): string {
        if (exResponse) {
            if (typeof exResponse === 'string') {
                return this.formatErrorCode(exResponse);
            }

            if ('error' in exResponse && typeof exResponse.error === 'string') {
                return this.formatErrorCode(exResponse.error);
            }
        }

        return this.formatErrorCode(HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR]);
    };

    private formatErrorCode(error: string): string {
        return _.toUpper(_.snakeCase(error));
    };
}