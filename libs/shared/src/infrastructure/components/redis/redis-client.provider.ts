import * as IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Provider } from '@nestjs/common';
import { RedisModuleAsyncOptions, RedisModuleOptions, REDIS_MODULE_OPTIONS, REDIS_CLIENT } from './redis.common';

export class RedisClientError extends Error { }

export interface RedisClient {
    defaultKey: string;
    clients: Map<string, IORedis.Redis>;
    size: number;
}

async function getClient(options: RedisModuleOptions): Promise<IORedis.Redis> {
    const { onClientReady, url, ...opt } = options;
    const client = url ? new IORedis.Redis(url) : new IORedis.Redis(opt);

    if (onClientReady) {
        onClientReady(client)
    }

    return client;
}

export const createClient = (): Provider => ({
    provide: REDIS_CLIENT,
    useFactory: async (options: RedisModuleOptions | RedisModuleOptions[]): Promise<RedisClient> => {
        const clients = new Map<string, IORedis.Redis>();
        let defaultKey = uuidv4();

        if (Array.isArray(options)) {
            await Promise.all(
                options.map(async o => {
                    const key = o.name || defaultKey;
                    if (clients.has(key)) {
                        throw new RedisClientError(`${o.name || 'default'} client is exists`);
                    }
                    clients.set(key, await getClient(o));
                }),
            );
        } else {
            if (options.name && options.name.length !== 0) {
                defaultKey = options.name;
            }
            clients.set(defaultKey, await getClient(options));
        }

        return {
            defaultKey,
            clients,
            size: clients.size,
        };
    },
    inject: [REDIS_MODULE_OPTIONS],
});

export const createAsyncClientOptions = (options: RedisModuleAsyncOptions) => ({
    provide: REDIS_MODULE_OPTIONS,
    useFactory: options.useFactory,
    inject: options.inject,
});