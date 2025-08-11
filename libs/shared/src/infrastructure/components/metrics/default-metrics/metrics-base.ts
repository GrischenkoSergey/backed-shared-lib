import { Meter, MeterProvider, diag, metrics } from '@opentelemetry/api';

export interface MetricsCollectorConfig {
  meterProvider?: MeterProvider;
  name?: string;
}

const DEFAULT_NAME = 'default_metrics';

export abstract class BaseMetrics {
  protected _logger = diag;
  protected _meter: Meter;
  private readonly _name: string;

  constructor(config?: MetricsCollectorConfig) {
    this._name = config?.name ?? DEFAULT_NAME;
    const meterProvider = config?.meterProvider ?? metrics.getMeterProvider();
    this._meter = meterProvider.getMeter(this._name);
  }

  protected abstract _createMetrics(): void;

  public abstract start(): void;
}
