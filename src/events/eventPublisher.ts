export interface EventPayload {
  [key: string]: any;
}

export interface IEventPublisher {
  publish(routingKey: string, payload: EventPayload): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): boolean;
}

