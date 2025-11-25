import { ILogger, LogContext } from '../../src/logging/logger.interface';

export class MockLogger implements ILogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  child = jest.fn((context: LogContext) => new MockLogger());
}

export function createMockLogger(): ILogger {
  return new MockLogger();
}

