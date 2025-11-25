export interface IEventProcessor<T = unknown> {
  process(data: T): Promise<void>;
}

