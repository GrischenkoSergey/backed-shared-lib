export declare type ClassType = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new(...args: any[]): {};
};

export type ConfigStorage = {
    [name: string]:
    | string
    | {
        [name: string]: string | number | boolean;
    };
};

export type ProcessEnv = NodeJS.ProcessEnv;

export interface IConfigExternalStorage {
    load(raw?: ProcessEnv): Promise<ProcessEnv | null>;
}

export type ConfigSource = {
    fromFile?: string;
    raw?: ProcessEnv;
    fromExternalStorages?: IConfigExternalStorage;
};
