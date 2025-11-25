import pino, { Logger as PinoLogger } from 'pino';
import { injectable } from 'inversify';
import { trace } from '@opentelemetry/api';
import type { ILogger, LogContext } from './logger.interface';
import { asyncContext } from './context';
import { config } from '../config/config';

@injectable()
export class PinoLoggerService implements ILogger {
  private logger: PinoLogger;
  private serviceName: string;

  constructor(serviceName: string = 'notification-service') {
    this.serviceName = serviceName;
    this.logger = this.createLogger();
  }

  private createLogger(): PinoLogger {
    const isDevelopment = config.nodeEnv === 'development';

    const baseConfig: pino.LoggerOptions = {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      base: {
        service: this.serviceName,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label: string) => {
          return { level: label };
        },
      },
    };

    if (!isDevelopment) {
      return pino({
        ...baseConfig,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      });
    }

    return pino(baseConfig);
  }

  private enrichContext(context?: LogContext): Record<string, unknown> {
    const asyncCtx = asyncContext.getContext();
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();
    
    const enriched: Record<string, unknown> = {
      ...context,
      userId: context?.userId ?? asyncCtx?.userId,
    };

    if (spanContext?.traceId) {
      enriched.trace_id = spanContext.traceId;
    }

    if (spanContext?.spanId) {
      enriched.span_id = spanContext.spanId;
    }

    return enriched;
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.enrichContext(context), message);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.enrichContext(context), message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.enrichContext(context), message);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const enriched = this.enrichContext(context);
    
    if (error) {
      this.logger.error(
        {
          ...enriched,
          err: error,
        },
        message
      );
    } else {
      this.logger.error(enriched, message);
    }
  }

  child(context: LogContext): ILogger {
    const childLogger = new PinoLoggerService(this.serviceName);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }
}

