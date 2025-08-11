import * as responseTime from 'response-time';
import * as urlParser from 'url';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Counter, Attributes, Histogram } from '@opentelemetry/api';
import { OpenTelemetryModuleOptions } from '../common/opentelemetry-options.interface';
import { MetricService } from '../services/metric.service';
import {
  getOrCreateCounter,
  getOrCreateHistogram,
  getOrCreateObservableCounter,
  getOrCreateObservableGauge,
  getOrCreateObservableUpDownCounter,
  getOrCreateUpDownCounter,
} from '../services/metric-data';
import { OPENTELEMETRY_MODULE_OPTIONS } from '../otel.constants';

const cluster = require('node:cluster');

@Injectable()
export class ApiMetricsMiddleware implements NestMiddleware {
  private readonly defaultAttributes: Attributes;
  private readonly httpServerRequestCount: Counter;
  private readonly httpServerResponseCount: Counter;
  private readonly httpServerDuration: Histogram;
  private readonly httpServerRequestSize: Histogram;
  private readonly httpServerResponseSize: Histogram;
  private readonly httpServerResponseSuccessCount: Counter;
  private readonly httpServerResponseErrorCount: Counter;
  private readonly httpClientRequestErrorCount: Counter;
  private readonly httpServerAbortCount: Counter;
  private readonly ignoreUndefinedRoutes: boolean;

  constructor(
    @Inject(MetricService) private readonly metricService: MetricService,
    @Inject(OPENTELEMETRY_MODULE_OPTIONS) private readonly options: OpenTelemetryModuleOptions = {}
  ) {
    const {
      defaultAttributes = {},
      ignoreUndefinedRoutes = false,
      prefix,
    } = options?.metrics?.apiMetrics ?? {};

    this.defaultAttributes = defaultAttributes;
    this.ignoreUndefinedRoutes = ignoreUndefinedRoutes;

    this.httpServerRequestCount = getOrCreateCounter('http.server.request.count', {
      description: 'Total number of HTTP requests',
      unit: 'requests',
      prefix,
    });

    this.httpServerResponseCount = getOrCreateCounter('http.server.response.count', {
      description: 'Total number of HTTP responses',
      unit: 'responses',
      prefix,
    });

    this.httpServerAbortCount = getOrCreateCounter('http.server.abort.count', {
      description: 'Total number of data transfers aborted',
      unit: 'requests',
      prefix,
    });

    this.httpServerDuration = getOrCreateHistogram('http.server.duration', {
      description: 'The duration of the inbound HTTP request',
      unit: 'ms',
      prefix,
    });

    this.httpServerRequestSize = getOrCreateHistogram('http.server.request.size', {
      description: 'Size of incoming bytes',
      unit: 'By',
      prefix,
    });

    this.httpServerResponseSize = getOrCreateHistogram('http.server.response.size', {
      description: 'Size of outgoing bytes',
      unit: 'By',
      prefix,
    });

    this.httpServerResponseSuccessCount = getOrCreateCounter(
      'http.server.response.success.count',
      {
        description: 'Total number of all successful responses',
        unit: 'responses',
        prefix,
      }
    );

    this.httpServerResponseErrorCount = getOrCreateCounter(
      'http.server.response.error.count',
      {
        description: 'Total number of all response errors',
        prefix,
      }
    );

    this.httpClientRequestErrorCount = getOrCreateCounter(
      'http.client.request.error.count',
      {
        description: 'Total number of client error requests',
        prefix,
      }
    );
  }

  use(req: any, res: any, next: any) {
    responseTime((req: any, res: any, time: any) => {
      const { route, url, method } = req;
      let path;

      if (route) {
        path = route.path;
      } else if (this.ignoreUndefinedRoutes) {
        return;
      } else {
        path = urlParser.parse(url, false).pathname;
      }

      this.httpServerRequestCount.add(1, { method, path });

      const requestLength = parseInt(req.headers['content-length'], 10) || 0;
      const responseLength: number = parseInt(res.getHeader('Content-Length'), 10) || 0;

      const status = res.statusCode ?? 500;
      const attributes: Attributes = {
        workerId: cluster.worker.id,
        method,
        status,
        path,
        ...this.defaultAttributes,
      };

      this.httpServerRequestSize.record(requestLength, attributes);
      this.httpServerResponseSize.record(responseLength, attributes);

      this.httpServerResponseCount.add(1, attributes);
      this.httpServerDuration.record(time, attributes);

      const codeClass = this.getStatusCodeClass(status);

      switch (codeClass) {
        case 'success':
          this.httpServerResponseSuccessCount.add(1);
          break;
        case 'redirect':
          this.httpServerResponseSuccessCount.add(1);
          break;
        case 'client_error':
          this.httpClientRequestErrorCount.add(1);
          break;
        case 'server_error':
          this.httpServerResponseErrorCount.add(1);
          break;
      }

      req.on('end', () => {
        if (req.aborted === true) {
          this.httpServerAbortCount.add(1);
        }
      });
    })(req, res, next);
  }

  private getStatusCodeClass(code: number): string {
    if (code < 200) return 'info';
    if (code < 300) return 'success';
    if (code < 400) return 'redirect';
    if (code < 500) return 'client_error';
    return 'server_error';
  }
}
