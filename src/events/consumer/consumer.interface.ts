export interface IConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

