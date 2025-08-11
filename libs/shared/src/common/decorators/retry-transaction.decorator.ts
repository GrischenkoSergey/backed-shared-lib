import { WeakDI } from '../services/app-ref.service';
import { copyMetadataFromFunctionToFunction } from '../helpers/core-utils';
import { retryTransactionWrapper, RetryTransactionOptions } from '../helpers/transaction-wrappers';
import NestjsLoggerServiceAdapter from '../../logger/services/nestjs-logger.service';

const recordException = (name: string, error: any) => {
    const logger = WeakDI.resolve(this, NestjsLoggerServiceAdapter);

    if (logger) {
        logger.error(`Error in transaction ${name}`, 'RetryTransactionDecorator', null, error);
    }
};

type RetryTransactionDecoratorOptions<T extends any[]> = RetryTransactionOptions | ((...args: T) => RetryTransactionOptions);

export function RetryTransaction<T extends any[]>(
    options?: RetryTransactionDecoratorOptions<T>
): (
    target: any,
    propertyKey: PropertyKey,
    propertyDescriptor: TypedPropertyDescriptor<(...args: T) => any>
) => void;

export function RetryTransaction<T extends any[]>(
    name?: string,
    options?: RetryTransactionDecoratorOptions<T>
): (
    target: any,
    propertyKey: PropertyKey,
    propertyDescriptor: TypedPropertyDescriptor<(...args: T) => any>
) => void;

export function RetryTransaction<T extends any[]>(
    nameOrOptions?: string | RetryTransactionDecoratorOptions<T>,
    maybeOptions?: RetryTransactionDecoratorOptions<T>
) {
    return (
        target: any,
        propertyKey: PropertyKey,
        propertyDescriptor: TypedPropertyDescriptor<(...args: T) => any>
    ) => {
        let name: string;
        let options: RetryTransactionDecoratorOptions<T>;

        if (typeof nameOrOptions === 'string') {
            name = nameOrOptions;
            options = maybeOptions ?? {};
        } else {
            name = `${target.constructor.name}.${String(propertyKey)}`;
            options = nameOrOptions ?? {};
        }

        const originalFunction = propertyDescriptor.value;

        if (typeof originalFunction !== 'function') {
            throw new Error(
                `The @RetryTransaction decorator can be only used on functions, but ${propertyKey.toString()} is not a function.`
            );
        }

        if (originalFunction.constructor.name !== 'AsyncFunction') {
            throw new Error(
                `The @RetryTransaction decorator can be only used on async functions, but ${propertyKey.toString()} is not the async function.`
            );
        }

        const wrappedFunction = function PropertyDescriptor(this: any, ...args: T) {
            const transactionOptions = typeof options === 'function' ? options(...args) : options;

            if (!transactionOptions.name) {
                transactionOptions.name = name;
            }

            return retryTransactionWrapper(() => {
                return originalFunction
                    .apply(this, args)
                    .catch((error: any) => {
                        recordException(transactionOptions.name || name, error);
                        // Throw error to propagate it further
                        throw error;
                    })
                    .finally(() => {
                        // finalize original function
                    });
            }, transactionOptions);
        };

        propertyDescriptor.value = new Proxy(originalFunction, {
            apply: (_, thisArg, args: T) => {
                return wrappedFunction.apply(thisArg, args);
            },
        });

        copyMetadataFromFunctionToFunction(originalFunction, propertyDescriptor.value);
    };
}
