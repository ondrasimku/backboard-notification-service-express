import { injectable, inject } from 'inversify';
import { connect, ChannelModel, Channel, Options } from 'amqplib';
import { randomUUID } from 'crypto';
import { IEventPublisher, EventPayload } from './eventPublisher';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';
import config from '../config/config';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

@injectable()
export class RabbitMQEventPublisher implements IEventPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly exchange: string;
  private readonly connectionOptions: Options.Connect;
  private isConnected = false;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 10,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  };

  constructor(
    @inject(TYPES.Logger) private logger: ILogger
  ) {
    this.exchange = config.rabbitmq.exchange;
    this.connectionOptions = this.parseConnectionOptions(
      config.rabbitmq.url,
      config.rabbitmq.vhost
    );
  }

  private parseConnectionOptions(url: string, vhost: string): Options.Connect {
    try {
      const parsedUrl = new URL(url);
      
      return {
        protocol: parsedUrl.protocol.replace(':', '') as 'amqp' | 'amqps',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5672,
        username: parsedUrl.username || 'guest',
        password: parsedUrl.password || 'guest',
        vhost: vhost,
        heartbeat: 60,
      };
    } catch (error) {
      this.logger.error('Failed to parse RabbitMQ URL', error as Error);
      throw new Error('Invalid RabbitMQ URL configuration');
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
      this.retryConfig.maxDelayMs
    );
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.connection && this.channel) {
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        this.logger.info('Attempting to connect to RabbitMQ', {
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries
        });

        this.connection = await connect(this.connectionOptions);
        this.channel = await this.connection.createChannel();
        
        await this.channel.assertExchange(this.exchange, 'topic', {
          durable: true,
        });

        this.isConnected = true;

        this.connection.on('error', (err) => {
          this.logger.error('RabbitMQ connection error', err);
          this.isConnected = false;
        });

        this.connection.on('close', () => {
          this.logger.info('RabbitMQ connection closed');
          this.isConnected = false;
        });

        this.logger.info('Successfully connected to RabbitMQ', { exchange: this.exchange });
        return;
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === this.retryConfig.maxRetries - 1;
        
        this.logger.warn('Failed to connect to RabbitMQ', {
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries,
          error: error instanceof Error ? error.message : String(error)
        });

        if (isLastAttempt) {
          this.logger.error('Max retry attempts reached for RabbitMQ connection', lastError);
          throw new Error(
            `Failed to connect to RabbitMQ after ${this.retryConfig.maxRetries} attempts: ${lastError.message}`
          );
        }

        const backoffDelay = this.calculateBackoff(attempt);
        this.logger.debug('Retrying RabbitMQ connection', { delayMs: backoffDelay });
        await this.sleep(backoffDelay);
      }
    }
  }

  async publish(routingKey: string, payload: EventPayload): Promise<void> {
    if (!this.channel || !this.isConnected) {
      this.logger.warn('RabbitMQ not connected, attempting to reconnect', { routingKey });
      
      try {
        await this.connect();
        
        if (!this.channel) {
          return;
        }
      } catch (error) {
        this.logger.error('Failed to reconnect to RabbitMQ', error as Error, { routingKey });
        return;
      }
    }

    try {
      const envelope = {
        event: routingKey,
        source: 'notification-service',
        id: randomUUID(),
        data: payload,
      };
      const message = Buffer.from(JSON.stringify(envelope));
      
      this.channel.publish(this.exchange, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });

      this.logger.debug('Published event to RabbitMQ', { 
        exchange: this.exchange, 
        routingKey 
      });
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, { routingKey });
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.isConnected = false;
      this.logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', error as Error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected && this.connection !== null && this.channel !== null;
  }
}
