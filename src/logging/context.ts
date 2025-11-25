import { AsyncLocalStorage } from 'node:async_hooks';
import type { LogContext } from './logger.interface';

export interface RequestContext extends LogContext {
  requestId: string;
  traceparent?: string;
  userId?: string;
}

class AsyncContext {
  private storage: AsyncLocalStorage<RequestContext>;

  constructor() {
    this.storage = new AsyncLocalStorage<RequestContext>();
  }

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  updateContext(updates: Partial<RequestContext>): void {
    const current = this.getContext();
    if (current) {
      Object.assign(current, updates);
    }
  }
}

export const asyncContext = new AsyncContext();

