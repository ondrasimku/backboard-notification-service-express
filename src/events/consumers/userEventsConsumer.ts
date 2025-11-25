import { injectable, inject } from 'inversify';
import { ConsumeMessage } from 'amqplib';
import { BaseConsumer } from '../consumer/baseConsumer';
import { ILogger } from '../../logging/logger.interface';
import { TYPES } from '../../types/di.types';
import { Envelope } from '../types/envelope.types';
import { UserRegisteredProcessor, UserRegisteredData } from '../processors/userRegisteredProcessor';
import { PasswordResetRequestedProcessor, PasswordResetRequestedData } from '../processors/passwordResetRequestedProcessor';

@injectable()
export class UserEventsConsumer extends BaseConsumer {
  constructor(
    @inject(TYPES.Logger) logger: ILogger,
    @inject(TYPES.UserRegisteredProcessor) private readonly userRegisteredProcessor: UserRegisteredProcessor,
    @inject(TYPES.PasswordResetRequestedProcessor) private readonly passwordResetRequestedProcessor: PasswordResetRequestedProcessor
  ) {
    super(logger, {
      queueName: 'notification-service.user-events',
    });
  }

  protected async processMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const messageBody = msg.content.toString();
      const envelope: Envelope = JSON.parse(messageBody);

      if (!envelope.event || !envelope.data) {
        this.logger.warn('Invalid envelope structure', {
          queueName: 'notification-service.user-events',
          envelopeId: envelope.id,
        });
        return;
      }

      await this.routeMessage(envelope);
    } catch (error) {
      this.logger.error('Failed to parse message envelope', error as Error, {
        queueName: 'notification-service.user-events',
      });
      throw error;
    }
  }

  private async routeMessage(envelope: Envelope): Promise<void> {
    switch (envelope.event) {
      case 'user.registered':
        await this.userRegisteredProcessor.process(envelope.data as UserRegisteredData);
        break;

      case 'user.password-change-requested':
        await this.passwordResetRequestedProcessor.process(envelope.data as PasswordResetRequestedData);
        break;

      default:
        this.logger.warn('Unknown event type received', {
          event: envelope.event,
          source: envelope.source,
          envelopeId: envelope.id,
          queueName: 'notification-service.user-events',
        });
    }
  }
}

