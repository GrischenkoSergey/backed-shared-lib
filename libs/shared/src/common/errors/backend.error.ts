import * as express from 'express';
import * as _ from 'lodash';
import { HttpStatus } from '@nestjs/common';
import { CustomErrorCodes } from '../types/errors';

export class BackendError implements Error {
    public name: string;
    public message: string;
    public statusCode: number;
    public details: any;

    constructor (message: string, properties?: { code?: number, name?: string, errorCode?: string }) {
        let msg = message;

        if (_.isEmpty(properties)) {
            properties = {};
        }

        _.defaults(properties, { name: this.constructor.name, errorCode: CustomErrorCodes[this.constructor.name] });

        if (_.isEmpty(msg) && properties?.code) {
            msg = HttpStatus[properties.code];
        }

        this.statusCode = properties?.code!;
        this.message = msg;

        for (const key in properties) {
            if (key !== 'code') {
                this[key] = properties[key];
            }
        }

        Error.captureStackTrace(this, BackendError);
    }

    static Success (res: express.Response) {
        return res.type('json').status(200).end();
    }

    static Failed (res: express.Response) {
        return res.type('json').status(400).end();
    }

    static Empty (res: express.Response) {
        return res.status(200).end();
    }

    static BadRequest (res: express.Response) {
        return res.type('json').status(400).end();
    }
}


// import { HttpStatus, InternalServerErrorException } from '@nestjs/common';

// export class InternalServerError extends InternalServerErrorException {
//     public constructor(message: string, public readonly errorDetails?: any) {
//         super({message: message, statusCode: HttpStatus.INTERNAL_SERVER_ERROR});
//     }
// }
