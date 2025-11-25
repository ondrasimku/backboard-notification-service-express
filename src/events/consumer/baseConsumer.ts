import { injectable, inject } from 'inversify';
import { connect, ChannelModel, Channel, Options, ConsumeMessage } from 'amqplib';
import { ILogger } from '../../logging/logger.interface';
import { TYPES } from '../../types/di.types';
import config from '../../config/config';
import { IConsumer } from './consumer.interface';
import { ConsumerConfig, BackoffConfig } from './consumerConfig';

@injectable()
export abstract class BaseConsumer implements IConsumer {
  protected connection: ChannelModel | null = null;
  protected channel: Channel | null = null;
  private readonly connectionOptions: Options.Connect;
  private running = false;
  private isShuttingDown = false;
  private inFlightMessages = new Set<string>();
  private consumerTag: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly config: ConsumerConfig;
  private readonly backoffConfig: BackoffConfig;

  constructor(
    @inject(TYPES.Logger) protected readonly logger: ILogger,
    consumerConfig: ConsumerConfig
  ) {
    this.config = consumerConfig;
    this.connectionOptions = this.parseConnectionOptions(
      config.rabbitmq.url,
      config.rabbitmq.vhost
    );
    this.backoffConfig = {
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2,
      maxRetries: 10,
      ...consumerConfig.backoff,
    };
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
      this.backoffConfig.initialDelayMs * Math.pow(this.backoffConfig.multiplier, attempt),
      this.backoffConfig.maxDelayMs
    );
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('Consumer already running', { queueName: this.config.queueName });
      return;
    }

    this.isShuttingDown = false;
    await this.connectAndConsume();
  }

  private async connectAndConsume(): Promise<void> {
    let lastError: Error | null = null;

    this.cleanupConnection();

    for (let attempt = 0; attempt < this.backoffConfig.maxRetries; attempt++) {
      if (this.isShuttingDown) {
        return;
      }

      try {
        this.logger.info('Attempting to connect to RabbitMQ for consumer', {
          queueName: this.config.queueName,
          attempt: attempt + 1,
          maxRetries: this.backoffConfig.maxRetries,
        });

        this.connection = await connect(this.connectionOptions);
        this.channel = await this.connection.createChannel();

        if (this.config.prefetch) {
          await this.channel.prefetch(this.config.prefetch);
        }

        await this.channel.assertQueue(this.config.queueName, {
          durable: true,
        });

        this.setupConnectionHandlers();

        const consumeReply = await this.channel.consume(
          this.config.queueName,
          (msg) => this.handleMessage(msg),
          { noAck: false }
        );
        this.consumerTag = consumeReply.consumerTag;

        this.running = true;

        this.logger.info('Consumer started successfully', {
          queueName: this.config.queueName,
          consumerTag: this.consumerTag,
        });

        return;
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === this.backoffConfig.maxRetries - 1;
        
        this.logger.warn('Failed to connect consumer to RabbitMQ', {
          queueName: this.config.queueName,
          attempt: attempt + 1,
          maxRetries: this.backoffConfig.maxRetries,
          error: error instanceof Error ? error.message : String(error),
        });

        if (isLastAttempt) {
          this.logger.error('Max retry attempts reached for consumer connection', lastError, {
            queueName: this.config.queueName,
          });
          throw new Error(
            `Failed to connect consumer after ${this.backoffConfig.maxRetries} attempts: ${lastError.message}`
          );
        }

        if (!this.isShuttingDown) {
          const backoffDelay = this.calculateBackoff(attempt);
          this.logger.debug('Retrying consumer connection', {
            queueName: this.config.queueName,
            delayMs: backoffDelay,
          });
          await this.sleep(backoffDelay);
        }
      }
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection || !this.channel) {
      return;
    }

    this.connection.on('error', (err) => {
      this.logger.error('RabbitMQ connection error in consumer', err, {
        queueName: this.config.queueName,
      });
      this.handleConnectionLoss();
    });

    this.connection.on('close', () => {
      this.logger.info('RabbitMQ connection closed for consumer', {
        queueName: this.config.queueName,
      });
      this.handleConnectionLoss();
    });

    this.channel.on('error', (err) => {
      this.logger.error('RabbitMQ channel error in consumer', err, {
        queueName: this.config.queueName,
      });
      this.handleConnectionLoss();
    });

    this.channel.on('close', () => {
      this.logger.info('RabbitMQ channel closed for consumer', {
        queueName: this.config.queueName,
      });
      this.handleConnectionLoss();
    });
  }

  private handleConnectionLoss(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.running = false;
    this.consumerTag = null;
    this.cleanupConnection();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.scheduleReconnect(0);
  }

  private scheduleReconnect(attempt: number): void {
    if (this.isShuttingDown) {
      return;
    }

    const delay = attempt === 0 
      ? this.backoffConfig.initialDelayMs 
      : this.calculateBackoff(attempt - 1);

    this.reconnectTimeout = setTimeout(async () => {
      if (this.isShuttingDown) {
        return;
      }

      this.logger.info('Attempting to reconnect consumer', {
        queueName: this.config.queueName,
        attempt: attempt + 1,
      });

      try {
        await this.connectAndConsume();
      } catch (err) {
        this.logger.error('Failed to reconnect consumer', err as Error, {
          queueName: this.config.queueName,
          attempt: attempt + 1,
        });
        this.scheduleReconnect(attempt + 1);
      }
    }, delay);
  }

  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || this.isShuttingDown) {
      return;
    }

    const messageId = msg.properties.messageId || 
                     msg.properties.headers?.['x-message-id'] || 
                     `delivery-${msg.fields.deliveryTag}`;
    this.inFlightMessages.add(messageId);

    try {
      await this.processMessage(msg);
      const channel = this.channel;
      if (channel && !this.isShuttingDown) {
        try {
          channel.ack(msg);
        } catch (ackError) {
          this.logger.warn('Error acknowledging message', {
            queueName: this.config.queueName,
            messageId,
            error: ackError instanceof Error ? ackError.message : String(ackError),
          });
        }
      }
    } catch (error) {
      this.logger.error('Error processing message', error as Error, {
        queueName: this.config.queueName,
        messageId,
      });
      
      const channel = this.channel;
      if (channel && !this.isShuttingDown) {
        try {
          channel.nack(msg, false, false);
        } catch (nackError) {
          this.logger.warn('Error nacking message', {
            queueName: this.config.queueName,
            messageId,
            error: nackError instanceof Error ? nackError.message : String(nackError),
          });
        }
      }
    } finally {
      this.inFlightMessages.delete(messageId);
    }
  }

  protected abstract processMessage(msg: ConsumeMessage): Promise<void>;

  async stop(): Promise<void> {
    if (!this.running && this.inFlightMessages.size === 0) {
      return;
    }

    this.logger.info('Stopping consumer', {
      queueName: this.config.queueName,
      inFlightMessages: this.inFlightMessages.size,
    });

    this.isShuttingDown = true;
    this.running = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.consumerTag && this.channel) {
      try {
        await this.channel.cancel(this.consumerTag);
        this.logger.debug('Consumer cancelled', {
          queueName: this.config.queueName,
          consumerTag: this.consumerTag,
        });
      } catch (error) {
        this.logger.warn('Error cancelling consumer', {
          queueName: this.config.queueName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.consumerTag = null;
    }

    const maxWaitTime = 30000;
    const checkInterval = 100;
    const startTime = Date.now();

    while (this.inFlightMessages.size > 0 && Date.now() - startTime < maxWaitTime) {
      await this.sleep(checkInterval);
    }

    if (this.inFlightMessages.size > 0) {
      this.logger.warn('Some messages still in flight after shutdown timeout', {
        queueName: this.config.queueName,
        remainingMessages: this.inFlightMessages.size,
      });
    }

    this.cleanupConnection();

    this.logger.info('Consumer stopped', {
      queueName: this.config.queueName,
    });
  }

  private cleanupConnection(): void {
    if (this.channel) {
      this.channel.removeAllListeners();
      this.channel = null;
    }

    if (this.connection) {
      this.connection.removeAllListeners();
      this.connection.close().catch((err) => {
        this.logger.warn('Error closing connection during cleanup', {
          queueName: this.config.queueName,
          error: err instanceof Error ? err.message : String(err),
        });
      });
      this.connection = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}

