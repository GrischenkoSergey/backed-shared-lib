export const METRICS_SERVICE = Symbol('METRICS_SERVICE');

export interface IMetric {
    IncCounter(key: string, value?: number, labels?: Record<string, string | number>): void;
    UpDownCounter(key: string, value: number, labels?: Record<string, string | number>): void;
    Histogram(key: string, value: number, labels?: Record<string, string | number>): void;
    ObservableCounter(key: string, callback: (observer: (value: number, labels?: Record<string, string | number>) => void) => void): void;
    ObservableGauge(key: string, callback: (observer: (value: number, labels?: Record<string, string | number>) => void) => void): void;
    ObservableUpDownCounter(key: string, callback: (observer: (value: number, labels?: Record<string, string | number>) => void) => void): void;
}

