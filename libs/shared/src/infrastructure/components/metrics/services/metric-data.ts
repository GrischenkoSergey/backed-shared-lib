import {
  Counter,
  UpDownCounter,
  Histogram,
  ObservableGauge,
  ObservableCounter,
  ObservableUpDownCounter,
  metrics,
  MetricOptions
} from '@opentelemetry/api';
import { OTEL_METER_NAME } from '../otel.constants';

export type GenericMetric =
  | Counter
  | UpDownCounter
  | Histogram
  | ObservableGauge
  | ObservableCounter
  | ObservableUpDownCounter;

export enum MetricType {
  'Counter' = 'Counter',
  'UpDownCounter' = 'UpDownCounter',
  'Histogram' = 'Histogram',
  'ObservableGauge' = 'ObservableGauge',
  'ObservableCounter' = 'ObservableCounter',
  'ObservableUpDownCounter' = 'ObservableUpDownCounter',
}

export interface OtelMetricOptions extends MetricOptions {
  prefix?: string;
}

export const meterData: Map<string, GenericMetric> = new Map();

function getOrCreate(name: string, type: MetricType, options: OtelMetricOptions = {}): GenericMetric | undefined {
  const nameWithPrefix = options.prefix ? `${options.prefix}.${name}` : name;

  let metric = meterData.get(nameWithPrefix);

  if (metric === undefined) {
    const meter = metrics.getMeterProvider().getMeter(OTEL_METER_NAME);
    metric = meter[`create${type}`](nameWithPrefix, options);
    meterData.set(nameWithPrefix, metric);
  }

  return metric;
}

export function getOrCreateHistogram(name: string, options: OtelMetricOptions = {}): Histogram {
  return getOrCreate(name, MetricType.Histogram, options) as Histogram;
}

export function getOrCreateCounter(name: string, options: OtelMetricOptions = {}): Counter {
  return getOrCreate(name, MetricType.Counter, options) as Counter;
}

export function getOrCreateUpDownCounter(name: string, options: OtelMetricOptions = {}): UpDownCounter {
  return getOrCreate(name, MetricType.UpDownCounter, options) as UpDownCounter;
}

export function getOrCreateObservableGauge(name: string, options: OtelMetricOptions = {}): ObservableGauge {
  return getOrCreate(name, MetricType.ObservableGauge, options) as ObservableGauge;
}

export function getOrCreateObservableCounter(name: string, options: OtelMetricOptions = {}): ObservableCounter {
  return getOrCreate(name, MetricType.ObservableCounter, options) as ObservableCounter;
}

export function getOrCreateObservableUpDownCounter(name: string, options: OtelMetricOptions = {}): ObservableUpDownCounter {
  return getOrCreate(name, MetricType.ObservableUpDownCounter, options) as ObservableUpDownCounter;
}
