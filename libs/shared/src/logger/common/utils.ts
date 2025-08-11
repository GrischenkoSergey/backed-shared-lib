
export function getPlainObject(object: any, excludeFields?: string[]) {
    const result = {};

    if (Array.isArray(object)) {
        object.forEach(o => {
            Object.getOwnPropertyNames(o).forEach(k => {
                if (!excludeFields?.includes(k)) {
                    result[k] = o[k];
                }
            });
        });
    } else {
        Object.getOwnPropertyNames(object).forEach(k => {
            if (!excludeFields?.includes(k)) {
                result[k] = object[k];
            }
        });
    }

    return result;
}

export function errorReplacer(key: string, value: any) {
    if (value instanceof Error) {
        const error = {};

        Object.getOwnPropertyNames(value).forEach(k => {
            error[k] = value[k];
        });

        return error;
    }

    return value;
}
