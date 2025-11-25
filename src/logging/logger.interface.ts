export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  trace_id?: string;
  span_id?: string;
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  
  child(context: LogContext): ILogger;
}

