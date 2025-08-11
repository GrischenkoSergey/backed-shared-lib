import { Injectable } from '@nestjs/common';
import { IMetric } from '../../../features/metrics.feature';
import {
  getOrCreateCounter,
  getOrCreateHistogram,
  getOrCreateObservableCounter,
  getOrCreateObservableGauge,
  getOrCreateObservableUpDownCounter,
  getOrCreateUpDownCounter,
} from './metric-data';
import {
  Counter,
  UpDownCounter,
  Histogram,
  ObservableGauge,
  ObservableCounter,
  ObservableUpDownCounter,
  ObservableResult
} from '@opentelemetry/api';


@Injectable()
export class MetricService implements IMetric {
  private readonly counter: Record<string, Counter> = {};
  private readonly upDownCounter: Record<string, UpDownCounter> = {};
  private readonly observableCounter: Record<string, ObservableCounter> = {};
  private readonly observableUpDownCounter: Record<string, ObservableUpDownCounter> = {};
  private readonly observableGauge: Record<string, ObservableGauge> = {};
  private readonly histogram: Record<string, Histogram> = {};

  public IncCounter(key: string, value: number = 1, labels?: Record<string, string | number>) {
    if (!this.counter[key]) {
      this.counter[key] = getOrCreateCounter(key, {
        description: `Counter for ${key}`
      })
    }
    this.counter[key].add(value, labels || {});
  }

  public UpDownCounter(key: string, value: number, labels?: Record<string, string | number>) {
    if (!this.upDownCounter[key]) {
      this.upDownCounter[key] = getOrCreateUpDownCounter(key, {
        description: `Up-down counter for ${key}`
      })
    }
    this.upDownCounter[key].add(value, labels || {});
  }

  public Histogram(key: string, value: number, labels?: Record<string, string | number>) {
    if (!this.histogram[key]) {
      this.histogram[key] = getOrCreateHistogram(key, {
        description: `Histogram for ${key}`
      });
    }
    this.histogram[key].record(value, labels || {});
  }

  public ObservableCounter(key: string, callback: (observer: (value: number, labels?: Record<string, string | number>) => void) => void) {
    if (!this.observableCounter[key]) {
      this.observableCounter[key] = getOrCreateObservableCounter(key, {
        description: `Observable counter for ${key}`
      });
      this.observableCounter[key].addCallback(async (observableResult: ObservableResult) => {
        callback((value: number, labels?: Record<string, string | number>) => {
          observableResult.observe(value, labels);
        });
      });
    }
  }

  public ObservableGauge(key: string, callback: (observer: (value: number, labels?: Record<string, string | number>) => void) => void) {
    if (!this.observableGauge[key]) {
      this.observableGauge[key] = getOrCreateObservableGauge(key, {
        description: `Observable gauge for ${key}`
      });
      this.observableGauge[key].addCallback(async (observableResult: ObservableResult) => {
        callback((value: number, labels?: Record<string, string | number>) => {
          observableResult.observe(value, labels);
        });
      });
    }
  }

  public ObservableUpDownCounter(key: string, callback: (observer: (value: number, labels?: Record<string, string | number>) => void) => void) {
    if (!this.observableUpDownCounter[key]) {
      this.observableUpDownCounter[key] = getOrCreateObservableUpDownCounter(key, {
        description: `Observable up-down counter for ${key}`
      });
      this.observableUpDownCounter[key].addCallback(async (observableResult: ObservableResult) => {
        callback((value: number, labels?: Record<string, string | number>) => {
          observableResult.observe(value, labels);
        });
      });
    }
  }
}
