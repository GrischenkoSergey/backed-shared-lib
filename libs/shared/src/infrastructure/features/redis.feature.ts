export const REDIS_SERVICE = Symbol('REDIS_SERVICE');

export interface IRedisClient {
    getClient(name?: string): any;
    getObjectByKey(key: string): Promise<Record<string, string> | null>;
    setObjectByKey(key: string, data: any, lifetimeInMilliseconds: number);
    deleteObjectByKey(key: string);
}
