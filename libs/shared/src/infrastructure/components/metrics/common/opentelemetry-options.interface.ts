import { ModuleMetadata, Type, Abstract } from '@nestjs/common';
import { Attributes } from '@opentelemetry/api';
import { RouteInfo } from '@nestjs/common/interfaces';

export type OpenTelemetryModuleOptions = {
  metrics?: OpenTelemetryMetrics;
};

export interface OpenTelemetryOptionsFactory {
  createOpenTelemetryOptions(): Promise<OpenTelemetryModuleOptions> | OpenTelemetryModuleOptions;
}

export interface OpenTelemetryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  useClass?: Type<OpenTelemetryOptionsFactory>;
  useExisting?: Type<OpenTelemetryOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<OpenTelemetryModuleOptions> | OpenTelemetryModuleOptions;
  inject?: (string | symbol | Function | Type<any> | Abstract<any>)[];
}

export type OpenTelemetryMetrics = {
  hostMetrics?: boolean;
  apiMetrics?: {
    enable?: boolean;
    defaultAttributes?: Attributes;
    ignoreRoutes?: (string | RouteInfo)[];
    ignoreUndefinedRoutes?: boolean;
    prefix?: string;
  };
};
