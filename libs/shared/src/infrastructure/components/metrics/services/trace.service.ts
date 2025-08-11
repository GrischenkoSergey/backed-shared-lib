import { context, trace, Span } from '@opentelemetry/api';
import { Injectable } from '@nestjs/common';
import { ITracer, ISpan } from '../../../features/tracer.feature'
import { TraceSpan } from '../../../components/metrics/common/trace-span.wrapper';

@Injectable()
export class TraceService implements ITracer {
  constructor() {
    // Initialize the tracer if needed
  }

  public startSpan(name: string): ISpan {
    return new TraceSpan(this.getTracer().startSpan(name));
  }

  public startActiveSpan(name: string, fn: (span: ISpan) => void): void {
    const span = this.getTracer().startSpan(name)
    const previousSpan = this.getSpan();

    context.with(trace.setSpan(context.active(), span), () => {
      try {
        fn(new TraceSpan(span));
      } finally {
        span.end();

        if (previousSpan) {
          trace.setSpan(context.active(), previousSpan);
        }
      }
    });
  }

  public async startActiveSpanAsync(name: string, fn: (span: ISpan) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const span = this.getTracer().startSpan(name)
      const previousSpan = this.getSpan();

      try {
        context.with(trace.setSpan(context.active(), span), () => {
          fn(new TraceSpan(span));
          resolve();
        });
      } catch (error) {
        reject(error);
      }
      finally {
        span.end();

        if (previousSpan) {
          trace.setSpan(context.active(), previousSpan);
        }
      }
    });
  }

  private getTracer() {
    return trace.getTracer('default');
  }

  private getSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }
}
