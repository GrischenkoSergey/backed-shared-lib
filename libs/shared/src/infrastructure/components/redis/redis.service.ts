import { Injectable, Inject } from '@nestjs/common';
import { REDIS_CLIENT, RedisObject } from './redis.common';
import { Redis } from 'ioredis';
import { RedisClient, RedisClientError } from './redis-client.provider';
import { IRedisClient } from '../../features/redis.feature';
import { SettingsConfig } from '../../../common/types/configs';
import { RedisError } from '../../../common/errors';

@Injectable()
export class RedisService implements IRedisClient {
    private readonly prefix: string;

    constructor(
        @Inject(REDIS_CLIENT) private readonly redisClient: RedisClient,
        @Inject(SettingsConfig) private readonly config: SettingsConfig
    ) {
        this.prefix = `${this.config.solution_id}-${this.config.project_id}:`;
    }

    public async getObjectByKey(key: string): Promise<Record<string, string> | null> {
        const client = this.getClient();

        return client.exists(this.prefix + key)
            .then(existsNumber => {
                if (existsNumber === 1) {
                    return client.hgetall(this.prefix + key);
                }

                return null;
            });
    }

    public async setObjectByKey(key: string, data: any, lifetimeInMilliseconds: number) {
        const client = this.getClient();
        const obj: RedisObject = { body: JSON.stringify(data) };

        return client.hmset(this.prefix + key, obj)
            .then(ok => {
                if (!ok) {
                    throw new RedisError('Redis mset result is not OK.');
                }

                return client.pexpire(this.prefix + key, lifetimeInMilliseconds);
            })
            .then(result => {
                if (!result) {
                    throw new RedisError('Redis expiration result is not OK.');
                }

                return true;
            });
    }

    public async deleteObjectByKey(key: string) {
        const client = this.getClient();

        return client.del(this.prefix + key)
            .then(result => {
                return (result > 0);
            });
    }

    public getClient(name?: string): Redis {
        if (!name) {
            name = this.redisClient.defaultKey;
        }

        if (!this.redisClient.clients.has(name)) {
            throw new RedisClientError(`client ${name} does not exist`);
        }

        return this.redisClient.clients.get(name)!;
    }

    public getClients(): Map<string, Redis> {
        return this.redisClient.clients;
    }
}