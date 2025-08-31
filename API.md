# API Reference

This document provides detailed API reference for the NestJS Shared Library.

## Services

### IRedisClient

Redis client interface for database operations.

\`\`\`typescript
interface IRedisClient {
  getClient(name?: string): Redis;
  getClients(): Map<string, Redis>;
}
\`\`\`

#### Methods

**getClient(name?: string): Redis**
- Returns a Redis client instance
- `name`: Optional client name (defaults to 'default')

**getClients(): Map<string, Redis>**
- Returns all Redis client instances

#### Usage Example

\`\`\`typescript
@Injectable()
export class CacheService {
  constructor(
    @Inject(REDIS_SERVICE) private redis: IRedisClient
  ) {}

  async set(key: string, value: any, ttl: number = 3600) {
    const client = this.redis.getClient();
    await client.setex(key, ttl, JSON.stringify(value));
  }

  async get(key: string) {
    const client = this.redis.getClient();
    const result = await client.get(key);
    return result ? JSON.parse(result) : null;
  }
}
\`\`\`

### IScheduler

Task scheduling interface for cron jobs and delayed tasks.

\`\`\`typescript
interface IScheduler {
  addCronJob(name: string, cronExpression: string, callback: () => Promise<void>): Promise<void>;
  addIntervalJob(name: string, interval: number, callback: () => Promise<void>): Promise<void>;
  addDelayedJob(name: string, delay: number, callback: () => Promise<void>): Promise<void>;
  removeJob(name: string): Promise<void>;
  getJobs(): Promise<ScheduledJob[]>;
}
\`\`\`

#### Methods

**addCronJob(name, cronExpression, callback)**
- Schedules a recurring job using cron expression
- `name`: Unique job identifier
- `cronExpression`: Cron expression (e.g., '0 2 * * *' for daily at 2 AM)
- `callback`: Async function to execute

**addIntervalJob(name, interval, callback)**
- Schedules a recurring job with fixed interval
- `name`: Unique job identifier
- `interval`: Interval in milliseconds
- `callback`: Async function to execute

**addDelayedJob(name, delay, callback)**
- Schedules a one-time job with delay
- `name`: Unique job identifier
- `delay`: Delay in milliseconds
- `callback`: Async function to execute

**removeJob(name)**
- Removes a scheduled job
- `name`: Job identifier

**getJobs()**
- Returns list of all scheduled jobs

#### Usage Example

\`\`\`typescript
@Injectable()
export class TaskService {
  constructor(
    @Inject(SCHEDULER_SERVICE) private scheduler: IScheduler
  ) {}

  async setupTasks() {
    // Daily backup at 2 AM
    await this.scheduler.addCronJob(
      'daily-backup',
      '0 2 * * *',
      async () => {
        await this.performBackup();
      }
    );

    // Health check every 30 seconds
    await this.scheduler.addIntervalJob(
      'health-check',
      30000,
      async () => {
        await this.checkHealth();
      }
    );

    // One-time cleanup in 5 minutes
    await this.scheduler.addDelayedJob(
      'cleanup',
      5 * 60 * 1000,
      async () => {
        await this.cleanup();
      }
    );
  }
}
\`\`\`

### IMetric

Metrics collection interface for monitoring and observability.

\`\`\`typescript
interface IMetric {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  decrementCounter(name: string, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  recordSummary(name: string, value: number, labels?: Record<string, string>): void;
}
\`\`\`

#### Methods

**incrementCounter(name, labels?)**
- Increments a counter metric
- `name`: Metric name
- `labels`: Optional labels for metric dimensions

**decrementCounter(name, labels?)**
- Decrements a counter metric
- `name`: Metric name
- `labels`: Optional labels for metric dimensions

**setGauge(name, value, labels?)**
- Sets a gauge metric value
- `name`: Metric name
- `value`: Numeric value
- `labels`: Optional labels for metric dimensions

**recordHistogram(name, value, labels?)**
- Records a value in a histogram
- `name`: Metric name
- `value`: Numeric value to record
- `labels`: Optional labels for metric dimensions

**recordSummary(name, value, labels?)**
- Records a value in a summary
- `name`: Metric name
- `value`: Numeric value to record
- `labels`: Optional labels for metric dimensions

#### Usage Example

\`\`\`typescript
@Injectable()
export class OrderService {
  constructor(
    @Inject(METRICS_SERVICE) private metrics: IMetric
  ) {}

  async processOrder(order: Order) {
    // Increment order counter
    this.metrics.incrementCounter('orders_total', {
      status: 'processing',
      product: order.product
    });

    const startTime = Date.now();

    try {
      await this.processOrderLogic(order);
      
      // Record processing time
      this.metrics.recordHistogram(
        'order_processing_duration_ms',
        Date.now() - startTime,
        { status: 'success', product: order.product }
      );

      this.metrics.incrementCounter('orders_total', {
        status: 'completed',
        product: order.product
      });

    } catch (error) {
      this.metrics.incrementCounter('orders_total', {
        status: 'failed',
        product: order.product
      });
      throw error;
    }
  }
}
\`\`\`

### ITracer

Distributed tracing interface for request tracing and debugging.

\`\`\`typescript
interface ITracer {
  startSpan(name: string, options?: SpanOptions): Span;
  getActiveSpan(): Span | undefined;
  withSpan<T>(span: Span, fn: () => T): T;
}

interface Span {
  setAttributes(attributes: Record<string, string | number | boolean>): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  recordException(exception: Error): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}
\`\`\`

#### Methods

**startSpan(name, options?)**
- Creates a new span for tracing
- `name`: Span name
- `options`: Optional span configuration

**getActiveSpan()**
- Returns the currently active span

**withSpan(span, fn)**
- Executes function within span context
- `span`: Span to use as context
- `fn`: Function to execute

#### Span Methods

**setAttributes(attributes)**
- Sets attributes on the span
- `attributes`: Key-value pairs of span attributes

**addEvent(name, attributes?)**
- Adds an event to the span
- `name`: Event name
- `attributes`: Optional event attributes

**recordException(exception)**
- Records an exception in the span
- `exception`: Error object

**setStatus(status)**
- Sets the span status
- `status`: Status object with code and optional message

**end()**
- Ends the span

#### Usage Example

\`\`\`typescript
@Injectable()
export class UserService {
  constructor(
    @Inject(TRACE_SERVICE) private tracer: ITracer
  ) {}

  async getUserProfile(userId: string) {
    const span = this.tracer.startSpan('getUserProfile');
    
    span.setAttributes({
      'user.id': userId,
      'operation': 'getUserProfile'
    });

    try {
      span.addEvent('Fetching user data');
      const user = await this.userRepository.findById(userId);
      
      span.addEvent('Fetching preferences');
      const preferences = await this.preferencesService.get(userId);
      
      span.setAttributes({
        'user.found': !!user,
        'preferences.count': preferences.length
      });
      
      return { user, preferences };
      
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
}
\`\`\`

### Logger

Centralized logging service with multiple transports.

\`\`\`typescript
interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;
}

interface LogContext {
  sourceClass?: string;
  props?: Record<string, any>;
}
\`\`\`

#### Methods

**debug(message, context?)**
- Logs debug message
- `message`: Log message
- `context`: Optional context with source class and properties

**info(message, context?)**
- Logs info message
- `message`: Log message
- `context`: Optional context with source class and properties

**warn(message, context?)**
- Logs warning message
- `message`: Log message
- `context`: Optional context with source class and properties

**error(message, context?)**
- Logs error message
- `message`: Log message
- `context`: Optional context with source class and properties

**fatal(message, context?)**
- Logs fatal message
- `message`: Log message
- `context`: Optional context with source class and properties

#### Usage Example

\`\`\`typescript
@Injectable()
export class PaymentService {
  constructor(
    @Inject(LoggerKey) private logger: Logger
  ) {}

  async processPayment(paymentData: PaymentData) {
    this.logger.info('Processing payment', {
      sourceClass: 'PaymentService',
      props: { 
        paymentId: paymentData.id,
        amount: paymentData.amount 
      }
    });

    try {
      const result = await this.paymentGateway.charge(paymentData);
      
      this.logger.info('Payment processed successfully', {
        sourceClass: 'PaymentService',
        props: { 
          paymentId: paymentData.id,
          transactionId: result.transactionId 
        }
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Payment processing failed', {
        sourceClass: 'PaymentService',
        props: { 
          paymentId: paymentData.id,
          error: error.message 
        }
      });
      throw error;
    }
  }
}
\`\`\`

## Decorators

### @RetryTransaction

Decorator for automatic retry logic with configurable backoff strategies.

\`\`\`typescript
@RetryTransaction(operationName: string, options?: RetryOptions)
\`\`\`

#### Options

\`\`\`typescript
interface RetryOptions {
  maxRetries?: number;        // Default: 3
  delay?: number;            // Default: 1000ms
  backoff?: 'fixed' | 'exponential' | 'linear'; // Default: 'exponential'
  retryCondition?: (error: Error) => boolean;
}
\`\`\`

#### Usage Example

\`\`\`typescript
@Injectable()
export class DatabaseService {
  
  @RetryTransaction('saveUser', {
    maxRetries: 5,
    delay: 500,
    backoff: 'exponential',
    retryCondition: (error) => error.name === 'ConnectionError'
  })
  async saveUser(user: User) {
    return await this.userRepository.save(user);
  }
}
\`\`\`

### @RateLimiter

Decorator for method-level rate limiting.

\`\`\`typescript
@RateLimiter(options: RateLimiterOptions)
\`\`\`

#### Options

\`\`\`typescript
interface RateLimiterOptions {
  points: number;           // Number of requests
  duration: number;         // Time window in seconds
  getId?: (req: Request) => string; // Custom key generator
}
\`\`\`

#### Usage Example

\`\`\`typescript
@Controller('api')
export class ApiController {
  
  @Get('data')
  @RateLimiter({
    points: 10,
    duration: 60,
    getId: (req) => req.ip + ':' + req.path
  })
  async getData() {
    return { data: 'sensitive information' };
  }
}
\`\`\`

## Guards

### RateLimiterGuard

Guard for protecting routes with rate limiting.

\`\`\`typescript
@Controller('api')
export class ApiController {
  
  @Get('protected')
  @UseGuards(RateLimiterGuard)
  async getProtectedData() {
    return { message: 'This endpoint is rate limited' };
  }
}
\`\`\`

## Error Classes

### BackendError

Base error class for backend operations.

\`\`\`typescript
class BackendError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}
\`\`\`

### RateLimiterError

Error thrown when rate limit is exceeded.

\`\`\`typescript
class RateLimiterError extends BackendError {
  constructor(
    message: string,
    public readonly limit: number,
    public readonly remaining: number,
    public readonly resetTime: Date
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED');
  }
}
\`\`\`

### RedisError

Error thrown for Redis operations.

\`\`\`typescript
class RedisError extends BackendError {
  constructor(message: string, public readonly operation?: string) {
    super(message, 'REDIS_ERROR');
  }
}
\`\`\`

### TransactionError

Error thrown for transaction operations.

\`\`\`typescript
class TransactionError extends BackendError {
  constructor(
    message: string,
    public readonly transactionId?: string,
    public readonly retryCount?: number
  ) {
    super(message, 'TRANSACTION_ERROR');
  }
}
\`\`\`

## Constants

### Service Tokens

\`\`\`typescript
export const METRICS_SERVICE = 'METRICS_SERVICE';
export const TRACE_SERVICE = 'TRACE_SERVICE';
export const SCHEDULER_SERVICE = 'SCHEDULER_SERVICE';
export const STATS_SERVICE = 'STATS_SERVICE';
export const REDIS_SERVICE = 'REDIS_SERVICE';
export const LoggerKey = 'Logger';
\`\`\`

### Configuration Keys

\`\`\`typescript
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
