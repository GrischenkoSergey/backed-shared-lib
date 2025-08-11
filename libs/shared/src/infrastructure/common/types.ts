export interface InfrastructureFeatureOptions {
};

export const SCHEDULER_INTERVALS_MS = {
    SERVER_STATS: 6000,
    CPU_LOAD: 5000,
};

export enum RegionType {
    UnitedStates = 'us',
    Europe = 'eu',
    Australia = 'au',
}

export const REGION_LABELS: { [id: string]: string } = {
    [RegionType.UnitedStates]: 'United States',
    [RegionType.Europe]: 'European Union',
    [RegionType.Australia]: 'Australia'
};

export enum ServerMessageName {
    SERVER_STATS = 'server-stats'
}
