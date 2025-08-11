import * as retry from 'async/retry';
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { getObjectProperties } from '../helpers/core-utils';
import { TransactionError } from '../errors';

export interface RetryTransactionOptions {
    name?: string;
    times?: number,
    interval?: number | ((retryCount: number) => number),
    errorFilter?: (err: any) => boolean
}

async function retryTransactionWrapper<T>(
    functionToRetry: (...args: any[]) => Promise<T> | Bluebird<T>,
    options: RetryTransactionOptions,
    ...args: any[]
): Promise<T> {
    return transactionRetryer<T>(
        callback => {
            functionToRetry(...args)
                .then((result: T) => callback(null, result))
                .catch(err => callback(err));
        }, options)
        .catch(err => {
            throw new TransactionError(
                `Cannot execute with many retries: ${functionToRetry.name || options.name}`,
                { name: err.constructor?.name, ..._.omit(getObjectProperties(err), ['stack']) }
            );
        });
}

async function transactionRetryer<T>(
    func: (err: any, data: T) => any,
    options: RetryTransactionOptions
): Promise<T> {
    return new Promise<T>((res, rej) => {
        retry(
            {
                times: options?.times || 5,
                interval: options?.interval || 200,
                errorFilter: options?.errorFilter || (() => false)
            },
            func,
            (err, data) => err ? rej(err) : res(data)
        );
    });
}

export {
    retryTransactionWrapper,
};
