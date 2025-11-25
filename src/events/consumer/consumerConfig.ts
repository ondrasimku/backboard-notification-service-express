export interface BackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  maxRetries: number;
}

export interface ConsumerConfig {
  queueName: string;
  prefetch?: number;
  backoff?: Partial<BackoffConfig>;
}

