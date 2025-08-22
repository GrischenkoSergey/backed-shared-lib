import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { ValidationError } from '../../config/common/validator';

export enum CustomErrorCodes {
    // -----------------------
    // - backend error codes -
    // -----------------------

    // Server errors
    // UD - user-defined, S - server error, 00  - error number
    ServerError = 'UDS000',
    UnexpectedRuntimeError = 'UDS001',
    UrlNotImplementedError = 'UDS002',
}

export class ExceptionResponse {
    error?: string;
    detail?: string;
    message?: string | string[] | ValidationError[];
}

@ApiSchema({ name: "ProblemDetail", description: "Contains the information about the error" })
export class ProblemDetail {
    @ApiProperty({
        description: 'The status code',
        type: Number
    })
    status: number;

    @ApiProperty({
        description: 'The method and path',
        type: String
    })
    instance?: string;

    @ApiProperty({
        description: 'The error code',
        type: String
    })
    code?: string;

    @ApiProperty({
        description: 'The error message',
        type: String
    })
    message: string;

    @ApiProperty({
        description: 'The error details',
        oneOf: [
            {
                type: 'string',

            },
            {
                type: 'object',
                description: 'arbitrary object'
            },
            {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            {
                type: 'array',
                items: {
                    type: 'object',
                    description: 'array of arbitrary objects'
                }
            }
        ]
    })
    detail?: string | object | ValidationError[] | Array<string | object>;

    [key: string]: unknown;
}

export class ErrorDetail {
    message: string;
    error?: {
        type?: string;
        instance?: string;
        detail?: string;
        code?: string;
    };
}
