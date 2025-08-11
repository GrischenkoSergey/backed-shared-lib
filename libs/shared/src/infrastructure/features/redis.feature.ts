export const REDIS_SERVICE = Symbol('REDIS_SERVICE');

export interface IRedisClient {
    getObjectByKey(key: string): Promise<Record<string, string> | null>;
    setObjectByKey(key: string, data: any, lifetimeInMilliseconds: number);
    deleteObjectByKey(key: string);
}
