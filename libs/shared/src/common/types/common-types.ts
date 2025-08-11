export declare type ClassType = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new(...args: any[]): {};
};

export type BootMessage = {
    type: string,
    plist: number[],
    startupTime: string,
    processId: number,
    code: number,
    signal: string,
    uniqueId: string
}
