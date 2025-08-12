import * as _ from 'lodash';
import * as yaml from 'js-yaml';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Config, Boolean, Number, String, Record, Type, plainToClass } from '../../config';
import {
  IsOptional,
  IsNotEmpty,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
  validateSync,
  ValidationError,
  ValidateNested,
} from '../../config/common/validator';
import { ClassType } from '../types/common-types';

const YAML_CONFIG_DIRNAME = '../../../../../../apps';

export const API_VERSION = 'v1';

export enum TracerType {
  NodeSDK = 'node-sdk',
  AzureMonitor = 'azure-monitor',
}

export enum ExporterType {
  None = 'none',
  Prometheus = 'prometheus',
  OtelCollector = 'otel_collector',
  Azure = 'azure',
}

@Config('Listen')
export class ListenConfig {
  @Boolean()
  readonly https: boolean;

  @String()
  @MinLength(3)
  @MaxLength(64)
  readonly hostname: string;

  @Number()
  @Min(3000)
  @Max(65535)
  readonly port: number;

  @String()
  @IsOptional()
  @MaxLength(1024)
  readonly cert_path: string;

  @String()
  @IsOptional()
  @MaxLength(1024)
  readonly key_path: string;

  @Boolean()
  @IsOptional()
  readonly enable_perf_monitor: boolean;

  @Boolean()
  @IsOptional()
  readonly enable_round_robin: boolean;
}

export class FileLogOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class ConsoleLogOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class SlackLogOptions {
  @Boolean()
  readonly enabled: boolean;

  @String()
  @IsOptional()
  @MaxLength(1024)
  readonly webhook_url: string;

  @String()
  @IsOptional()
  @MaxLength(64)
  readonly channel: string;
}

export class AzureCredentialsOptions {
  @String()
  @MaxLength(2048)
  readonly connection_string: string;
}

export class AzureLogOptions {
  @Boolean()
  readonly enabled: boolean;

  @ValidateNested()
  @Type(() => AzureCredentialsOptions)
  readonly credentials: AzureCredentialsOptions;
}

export class OtelCollectorLoggerOptions {
  @Boolean()
  readonly enabled: boolean;

  @Boolean()
  readonly https: boolean;

  @String()
  @IsOptional()
  @MinLength(3)
  @MaxLength(64)
  readonly hostname: string;

  @Number()
  @Min(3000)
  @Max(65535)
  readonly port: number;

  @String()
  @MinLength(1)
  @MaxLength(256)
  readonly path: string;
}

export class LogConfig {
  @ValidateNested()
  @Type(() => FileLogOptions)
  readonly file: FileLogOptions;

  @ValidateNested()
  @Type(() => ConsoleLogOptions)
  readonly console: ConsoleLogOptions;

  @ValidateNested()
  @Type(() => SlackLogOptions)
  readonly slack: SlackLogOptions;

  @ValidateNested()
  @Type(() => AzureLogOptions)
  readonly azure: AzureLogOptions;

  @ValidateNested()
  @Type(() => OtelCollectorLoggerOptions)
  readonly otel_collector: OtelCollectorLoggerOptions;
}

@Config('Storage')
export class StorageConfig {
  @String()
  @MinLength(1)
  @MaxLength(64)
  readonly logs: string;

  @String()
  @IsOptional()
  @MaxLength(64)
  readonly cache: string;
}

export class ServerStatsOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class SchedulerOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class DefaultMetricsOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class PrometheusOptions {
  @Boolean()
  readonly enabled: boolean;

  @String()
  @MinLength(3)
  @MaxLength(64)
  readonly hostname: string;

  @Number()
  @Min(3000)
  @Max(65535)
  readonly port: number;
}

export class OtelCollectorMetricsOptions {
  @Boolean()
  readonly enabled: boolean;

  @Boolean()
  readonly https: boolean;

  @String()
  @MinLength(3)
  @MaxLength(64)
  readonly hostname: string;

  @Number()
  @Min(3000)
  @Max(65535)
  readonly port: number;

  @String()
  @MinLength(1)
  @MaxLength(256)
  readonly path: string;

  @Number()
  @Min(500)
  @Max(300000)
  readonly interval: number;
}

export class OtelCollectorTracerOptions {
  @Boolean()
  readonly enabled: boolean;

  @Boolean()
  readonly https: boolean;

  @String()
  @MinLength(3)
  @MaxLength(64)
  readonly hostname: string;

  @Number()
  @Min(3000)
  @Max(65535)
  readonly port: number;

  @String()
  @MinLength(1)
  @MaxLength(256)
  readonly path: string;
}

export class AzureMetricsOptions {
  @Boolean()
  readonly enabled: boolean;

  @ValidateNested()
  @Type(() => AzureCredentialsOptions)
  readonly credentials: AzureCredentialsOptions;

  @Number()
  @Min(500)
  @Max(300000)
  readonly interval: number;
}

export class AzureTracerOptions {
  @Boolean()
  readonly enabled: boolean;

  @ValidateNested()
  @Type(() => AzureCredentialsOptions)
  readonly credentials: AzureCredentialsOptions;
}

export class AzureSdkInstrumentationOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class HttpInstrumentationOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class MongoDbInstrumentationOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class MySqlInstrumentationOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class PostgreSqlInstrumentationOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class RedisInstrumentationOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class Redis4InstrumentationOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class ApiCustomMetricsOptions {
  @Boolean()
  readonly enabled: boolean;

  @Record()
  @IsOptional()
  readonly default_labels: Record<string, string>;

  @IsOptional()
  readonly ignore_routes: string[];

  @Boolean()
  @IsOptional()
  readonly ignore_undefined_routes: boolean;
}

export class ProcessCustomMetricsOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class InstrumentationsOptions {
  @ValidateNested()
  @Type(() => AzureSdkInstrumentationOptions)
  azure_sdk: AzureSdkInstrumentationOptions;

  @ValidateNested()
  @Type(() => HttpInstrumentationOptions)
  http: HttpInstrumentationOptions

  @ValidateNested()
  @Type(() => MongoDbInstrumentationOptions)
  mongodb: MongoDbInstrumentationOptions

  @ValidateNested()
  @Type(() => MySqlInstrumentationOptions)
  mysql: MySqlInstrumentationOptions

  @ValidateNested()
  @Type(() => PostgreSqlInstrumentationOptions)
  postgresql: PostgreSqlInstrumentationOptions

  @ValidateNested()
  @Type(() => RedisInstrumentationOptions)
  redis: RedisInstrumentationOptions

  @ValidateNested()
  @Type(() => Redis4InstrumentationOptions)
  redis4: Redis4InstrumentationOptions
}

export class AzureMonitorOptions {
  @ValidateNested()
  @Type(() => AzureCredentialsOptions)
  readonly credentials: AzureCredentialsOptions;

  @Number()
  @Min(0)
  @Max(1)
  @IsOptional()
  readonly sampling_ratio: number;

  @Boolean()
  readonly enable_live_metrics: boolean;

  @Boolean()
  readonly enable_standard_metrics: boolean;

  @Boolean()
  readonly enable_performance_counters: boolean;
}

export class NodeSDKMetricsOptions {
  @String()
  @IsNotEmpty()
  @IsEnum(ExporterType)
  readonly exporter: string;

  @ValidateNested()
  @Type(() => PrometheusOptions)
  readonly prometheus: PrometheusOptions;

  @ValidateNested()
  @Type(() => OtelCollectorMetricsOptions)
  readonly otel_collector: OtelCollectorMetricsOptions;

  @ValidateNested()
  @Type(() => AzureMetricsOptions)
  readonly azure: AzureMetricsOptions;
}

export class NodeSDKTracersOptions {
  @ValidateNested()
  @Type(() => OtelCollectorTracerOptions)
  readonly otel_collector: OtelCollectorTracerOptions;

  @ValidateNested()
  @Type(() => AzureTracerOptions)
  readonly azure: AzureTracerOptions;
}

export class NodeSDKOptions {
  @ValidateNested()
  @Type(() => NodeSDKMetricsOptions)
  readonly metrics: NodeSDKMetricsOptions;

  @ValidateNested()
  @Type(() => NodeSDKTracersOptions)
  readonly tracers: NodeSDKTracersOptions;
}

export class CustomMetricsOptions {
  @ValidateNested()
  @Type(() => ApiCustomMetricsOptions)
  readonly api: ApiCustomMetricsOptions;

  @ValidateNested()
  @Type(() => ProcessCustomMetricsOptions)
  readonly process: ProcessCustomMetricsOptions;
}

export class RedisAuthOptions {
  @String()
  @MinLength(1)
  @MaxLength(63)
  @IsOptional()
  readonly username: string;

  @String()
  @MinLength(16)
  @MaxLength(128)
  @IsOptional()
  readonly password: string;
}

export class RedisSentinelOptions {
  @Boolean()
  readonly enabled: boolean;
}

export class RedisOptions {
  @Boolean()
  readonly enabled: boolean;

  @String()
  @MinLength(3)
  @MaxLength(64)
  @IsOptional()
  readonly hostname: string;

  @Number()
  @Min(3000)
  @Max(65535)
  @IsOptional()
  readonly port: number;

  @Number()
  @Min(0)
  @Max(15)
  readonly db: number;

  @Boolean()
  readonly use_tls: boolean;

  @ValidateNested()
  @Type(() => RedisAuthOptions)
  readonly auth: RedisAuthOptions;

  @ValidateNested()
  @Type(() => RedisSentinelOptions)
  readonly sentinel;
}

export class OpentelemetryOptions {
  @Boolean()
  readonly enabled: boolean;

  @String()
  @IsNotEmpty()
  @IsEnum(TracerType)
  readonly tracer: string;

  @ValidateNested()
  @Type(() => InstrumentationsOptions)
  readonly instrumentations: InstrumentationsOptions;

  @ValidateNested()
  @Type(() => AzureMonitorOptions)
  readonly azure_monitor;

  @ValidateNested()
  @Type(() => CustomMetricsOptions)
  readonly custom_metrics: CustomMetricsOptions;

  @ValidateNested()
  @Type(() => NodeSDKOptions)
  readonly node_sdk: NodeSDKOptions;
}

@Config('Databases')
export class DatabasesConfig {
  @ValidateNested()
  @Type(() => RedisOptions)
  readonly redis: RedisOptions;
}

@Config('Infrastructure')
export class InfrastructureConfig {
  @ValidateNested()
  @Type(() => OpentelemetryOptions)
  readonly opentelemetry: OpentelemetryOptions;

  @ValidateNested()
  @Type(() => SchedulerOptions)
  @IsOptional()
  readonly scheduler: SchedulerOptions;

  @ValidateNested()
  @Type(() => ServerStatsOptions)
  @IsOptional()
  readonly server_stats: ServerStatsOptions;

  @ValidateNested()
  @Type(() => LogConfig)
  readonly log: LogConfig;
}

@Config('Settings')
export class SettingsConfig {
  @String()
  @MinLength(3)
  @MaxLength(64)
  readonly product_name: string;

  @String()
  @MinLength(3)
  @MaxLength(64)
  readonly solution_id: string;

  @String()
  @MinLength(3)
  @MaxLength(64)
  readonly project_id: string;

  @String()
  @MinLength(1)
  @MaxLength(64)
  readonly project_unique_id: string;

  @Number()
  @Min(0)
  readonly worker_count: number

  @String()
  @MinLength(2)
  @MaxLength(3)
  readonly region: string;
}

export class AppConfig {
  @ValidateNested()
  @Type(() => ListenConfig)
  readonly listen: ListenConfig;

  @ValidateNested()
  @Type(() => StorageConfig)
  readonly storage: StorageConfig;

  @ValidateNested()
  @Type(() => SettingsConfig)
  readonly settings: SettingsConfig;

  @ValidateNested()
  @Type(() => InfrastructureConfig)
  readonly infrastructure: InfrastructureConfig;
}

// https://www.npmjs.com/package/@nestjs/class-validator
export function globalConfigValidation<T extends typeof AppConfig>(classType: T, config: Record<string, unknown>): InstanceType<T> {
  const validatedConfig = plainToClass(classType, config);
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((validationError: ValidationError) => validationError.toString())
        .join('\n'),
    );
  }

  return validatedConfig as InstanceType<T>;
}

export function loadConfig() {
  const defaultConfigFilePath = join(__dirname, YAML_CONFIG_DIRNAME, process.env.PROJECT_ID ?? '', 'configs', 'default.yaml');

  if (!existsSync(defaultConfigFilePath)) {
    throw new Error(`Default config file does not exist.`);
  }

  const configFilePath = join(__dirname, YAML_CONFIG_DIRNAME, process.env.PROJECT_ID ?? '', 'configs', process.env.NODE_ENV + '.yaml');

  if (!existsSync(configFilePath)) {
    throw new Error(`Config file for the '${process.env.NODE_ENV}' configuration does not exist.`);
  }

  const defaultConfig = yaml.load(readFileSync(defaultConfigFilePath, 'utf8')) as Record<string, any>;
  const config = yaml.load(readFileSync(configFilePath, 'utf8')) as Record<string, any>;

  return _.merge(defaultConfig, config);
};