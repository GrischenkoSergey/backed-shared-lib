import { BaseMetrics } from './metrics-base';
import { BatchObservableResult, ObservableCounter, ObservableGauge } from '@opentelemetry/api';
import {
  getProcessCpuUsageData,
  getProcessMemoryData,
  ATTRIBUTE_NAMES,
  CPU_LABELS,
  METRIC_NAMES,
  ProcessCpuUsageData
} from './common';

const cluster = require('node:cluster');

export class DefaultMetrics extends BaseMetrics {
  private _processCpuTime!: ObservableCounter;
  private _processCpuUtilization!: ObservableGauge;
  private _processMemoryUsage!: ObservableGauge;

  private _batchUpdateProcessCpuUsages(observableResult: BatchObservableResult, processCpuUsage: ProcessCpuUsageData): void {
    const stateAttr = ATTRIBUTE_NAMES.PROCESS_CPU_STATE;
    const workerAttr = ATTRIBUTE_NAMES.WORKER_ID;

    observableResult.observe(this._processCpuTime, processCpuUsage.user, {
      [stateAttr]: CPU_LABELS.USER,
      [workerAttr]: cluster.worker.id,
    });
    observableResult.observe(this._processCpuTime, processCpuUsage.system, {
      [stateAttr]: CPU_LABELS.USER,
      [workerAttr]: cluster.worker.id,
    });

    observableResult.observe(
      this._processCpuUtilization,
      processCpuUsage.userP,
      {
        [stateAttr]: CPU_LABELS.USER,
        [workerAttr]: cluster.worker.id,
      }
    );
    observableResult.observe(
      this._processCpuUtilization,
      processCpuUsage.systemP,
      {
        [stateAttr]: CPU_LABELS.SYSTEM,
        [workerAttr]: cluster.worker.id,
      }
    );
  }

  private _batchUpdateProcessMemUsage(observableResult: BatchObservableResult, memoryUsage: number): void {
    const workerAttr = ATTRIBUTE_NAMES.WORKER_ID;

    observableResult.observe(
      this._processMemoryUsage,
      memoryUsage,
      {
        [workerAttr]: cluster.worker.id,
      }
    );
  }

  protected _createMetrics(): void {
    this._processCpuTime = this._meter.createObservableCounter(
      METRIC_NAMES.PROCESS_CPU_TIME,
      {
        description: 'Process Cpu time in seconds',
        unit: 's',
      }
    );
    this._processCpuUtilization = this._meter.createObservableGauge(
      METRIC_NAMES.PROCESS_CPU_UTILIZATION,
      {
        description: 'Process Cpu usage time 0-1',
      }
    );
    this._processMemoryUsage = this._meter.createObservableGauge(
      METRIC_NAMES.PROCESS_MEMORY_USAGE,
      {
        description: 'Process Memory usage in bytes',
      }
    );

    this._meter.addBatchObservableCallback(
      async observableResult => {
        const processCpuUsages = await getProcessCpuUsageData();
        const processMemoryUsages = getProcessMemoryData();

        this._batchUpdateProcessCpuUsages(observableResult, processCpuUsages);
        this._batchUpdateProcessMemUsage(observableResult, processMemoryUsages);
      },
      [
        this._processCpuTime,
        this._processCpuUtilization,
        this._processMemoryUsage
      ]
    );
  }

  start() {
    this._createMetrics();
  }
}
