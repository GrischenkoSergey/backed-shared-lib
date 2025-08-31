# Configuration Guide

This document provides detailed information about configuring the NestJS Shared Library.

## Configuration Structure

The library uses a hierarchical configuration system with YAML files and environment variable support.

### File Structure

\`\`\`
apps/
└── {PROJECT_ID}/
    └── configs/
        ├── default.yaml      # Base configuration
        ├── development.yaml  # Development overrides
        ├── staging.yaml      # Staging overrides
        └── production.yaml   # Production overrides
\`\`\`

### Environment Variables

Required environment variables:

\`\`\`bash
NODE_ENV=development|staging|production
PROJECT_ID=your-project-id
\`\`\`

Optional environment variables for sensitive data:

\`\`\`bash
REDIS_PASSWORD=your-redis-password
AZURE_MONITOR_CONNECTION_STRING=your-azure-connection
SLACK_WEBHOOK_URL=your-slack-webhook
\`\`\`

## Configuration Classes

### InfrastructureConfig

Main infrastructure configuration:

\`\`\`typescript
@Config('Infrastructure')
export class InfrastructureConfig {
  databases: DatabasesOptions;
  opentelemetry: OpentelemetryOptions;
  scheduler?: SchedulerOptions;
  server_stats?: ServerStatsOptions;
  log: LogConfig;
}
\`\`\`

#### Database Configuration

\`\`\`yaml
infrastructure:
  databases:
    redis:
      enabled: true
      hostname: "localhost"
      port: 6379
      db: 0
      use_tls: false
      auth:
        username: "optional-username"
        password: "${REDIS_PASSWORD}"
      sentinel:
        enabled: false
\`\`\`

#### OpenTelemetry Configuration

\`\`\`yaml
infrastructure:
  opentelemetry:
    enabled: true
    tracer: "node-sdk"  # or "azure-monitor"
    
    instrumentations:
      azure_sdk:
        enabled: false
      http:
        enabled: true
      mongodb:
        enabled: false
      mysql:
        enabled: false
      postgresql:
        enabled: true
      redis:
        enabled: true
      redis4:
        enabled: false
    
    custom_metrics:
      api:
        enabled: true
        default_labels:
          service: "my-service"
          version: "1.0.0"
        ignore_routes:
          - "/health"
          - "/metrics"
        ignore_undefined_routes: true
      
      process:
        enabled: true
    
    node_sdk:
      metrics:
        exporter: "prometheus"  # "none", "prometheus", "otel_collector", "azure"
        
        prometheus:
          enabled: true
          hostname: "localhost"
          port: 9090
        
        otel_collector:
          enabled: false
          https: false
          hostname: "localhost"
          port: 4318
          path: "/v1/metrics"
          interval: 5000
        
        azure:
          enabled: false
          credentials:
            connection_string: "${AZURE_MONITOR_CONNECTION_STRING}"
          interval: 5000
      
      tracers:
        otel_collector:
          enabled: true
          https: false
          hostname: "localhost"
          port: 4318
          path: "/v1/traces"
        
        azure:
          enabled: false
          credentials:
            connection_string: "${AZURE_MONITOR_CONNECTION_STRING}"
    
    azure_monitor:
      credentials:
        connection_string: "${AZURE_MONITOR_CONNECTION_STRING}"
      sampling_ratio: 1.0
      enable_live_metrics: true
      enable_standard_metrics: true
      enable_performance_counters: true
\`\`\`

#### Logging Configuration

\`\`\`yaml
infrastructure:
  log:
    console:
      enabled: true
    
    file:
      enabled: false
    
    slack:
      enabled: false
      webhook_url: "${SLACK_WEBHOOK_URL}"
      channel: "#alerts"
    
    azure:
      enabled: false
      credentials:
        connection_string: "${AZURE_MONITOR_CONNECTION_STRING}"
    
    otel_collector:
      enabled: false
      https: false
      hostname: "localhost"
      port: 4318
      path: "/v1/logs"
\`\`\`

#### Scheduler Configuration

\`\`\`yaml
infrastructure:
  scheduler:
    enabled: true
\`\`\`

#### Server Stats Configuration

\`\`\`yaml
infrastructure:
  server_stats:
    enabled: true
\`\`\`

### SettingsConfig

Application-specific settings:

\`\`\`yaml
settings:
  product_name: "My Microservice"
  description: "A sample microservice"
  solution_id: "my-solution"
  project_id: "my-project"
  project_unique_id: "unique-identifier"
  worker_count: 4
  region: "us"
\`\`\`

### ListenConfig

Server listening configuration:

\`\`\`yaml
listen:
  https: false
  hostname: "0.0.0.0"
  port: 3000
  cert_path: "/path/to/cert.pem"  # Required if https: true
  key_path: "/path/to/key.pem"    # Required if https: true
  enable_perf_monitor: true
  enable_round_robin: false
\`\`\`

### StorageConfig

Storage paths configuration:

\`\`\`yaml
storage:
  logs: "logs"
  cache: "cache"
\`\`\`

## Configuration Validation

All configuration classes use class-validator decorators for validation:

\`\`\`typescript
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
}
\`\`\`

## Environment-Specific Overrides

Configuration files are merged in order:
1. `default.yaml` (base configuration)
2. `{NODE_ENV}.yaml` (environment-specific overrides)

Example production override:

\`\`\`yaml
# production.yaml
infrastructure:
  databases:
    redis:
      hostname: "prod-redis.company.com"
      port: 6380
      use_tls: true
      auth:
        password: "${REDIS_PASSWORD}"
  
  opentelemetry:
    azure_monitor:
      credentials:
        connection_string: "${AZURE_MONITOR_CONNECTION_STRING}"
      enable_live_metrics: true
  
  log:
    console:
      enabled: false
    azure:
      enabled: true
      credentials:
        connection_string: "${AZURE_MONITOR_CONNECTION_STRING}"

settings:
  worker_count: 8
  region: "us-east-1"
\`\`\`

## Custom Configuration Classes

You can create custom configuration classes:

\`\`\`typescript
import { Config, String, Number, Boolean } from '@your-org/shared-lib';

@Config('MyFeature')
export class MyFeatureConfig {
  @String()
  @MinLength(1)
  readonly api_key: string;

  @Number()
  @Min(1)
  @Max(100)
  readonly max_connections: number;

  @Boolean()
  readonly debug_mode: boolean;
}
\`\`\`

Then register it:

\`\`\`typescript
@Module({
  imports: [
    ConfigModule.forFeature([MyFeatureConfig])
  ]
})
export class MyFeatureModule {}
\`\`\`

And use it:

\`\`\`typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(MyFeatureConfig) private config: MyFeatureConfig
  ) {}
}
\`\`\`

## Configuration Best Practices

1. **Use Environment Variables for Secrets**: Never commit sensitive data to YAML files
2. **Validate Everything**: Use decorators to validate all configuration values
3. **Provide Defaults**: Always provide sensible defaults in `default.yaml`
4. **Document Configuration**: Comment your YAML files to explain complex settings
5. **Environment Parity**: Keep configuration structure consistent across environments
