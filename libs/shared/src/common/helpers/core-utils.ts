import { ExecutionContext } from '@nestjs/common';

export const cpuUsage = (oldUsage?: any): void => {
    let usage;

    if (oldUsage?._start) {
        usage = { ...process.cpuUsage(oldUsage._start.cpuUsage) };
        usage.time = Date.now() - oldUsage._start.time;
    } else {
        usage = { ...process.cpuUsage() };
        usage.time = process.uptime() * 1000; // s to ms
    }

    usage.percent = (usage.system + usage.user) / (usage.time * 10);

    Object.defineProperty(usage, '_start', {
        value: {
            cpuUsage: process.cpuUsage(),
            time: Date.now()
        }
    });

    return usage;
}

export const copyMetadataFromFunctionToFunction = (
    originalFunction: Function,
    newFunction: Function
): void => {
    // Get the current metadata and set onto the wrapper
    // to ensure other decorators ( ie: NestJS EventPattern / RolesGuard )
    // won't be affected by the use of this instrumentation
    Reflect.getMetadataKeys(originalFunction).forEach(metadataKey => {
        Reflect.defineMetadata(
            metadataKey,
            Reflect.getMetadata(metadataKey, originalFunction),
            newFunction
        );
    });
};

export const getObjectProperties = (objects: any): any => {
    const result = {};

    if (Array.isArray(objects)) {
        objects.forEach(o => {
            Object.getOwnPropertyNames(o).forEach(k => result[k] = o[k]);
        });
    } else {
        Object.getOwnPropertyNames(objects).forEach(k => result[k] = objects[k]);
    }

    return result;
}

export const getRequestIP = (ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip;
}

export const getRequestIPAndPath = (ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return `${request.ip}:${request.path}`;
}

export const getRequestBodyLogin = (ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.body.login;
}

