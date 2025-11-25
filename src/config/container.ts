import 'reflect-metadata';
import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { PinoLoggerService } from '../logging/pino.logger';
import { IHealthService, HealthService } from '../services/healthService';
import { HealthController } from '../controllers/healthController';
import { IEventPublisher } from '../events/eventPublisher';
import { RabbitMQEventPublisher } from '../events/rabbitmqEventPublisher';
import { UserRegisteredProcessor } from '../events/processors/userRegisteredProcessor';
import { PasswordResetRequestedProcessor } from '../events/processors/passwordResetRequestedProcessor';
import { UserEventsConsumer } from '../events/consumers/userEventsConsumer';
import { IConsumer } from '../events/consumer/consumer.interface';
import { IEmailService } from '../services/email/emailService.interface';
import { SmtpEmailService } from '../services/email/smtpEmailService';
import { ITemplateService } from '../services/template/templateService.interface';
import { HandlebarsTemplateService } from '../services/template/handlebarsTemplateService';
import AppDataSource from './database';

const container = new Container();

container.bind<DataSource>(TYPES.DataSource).toConstantValue(AppDataSource);
container.bind<ILogger>(TYPES.Logger).to(PinoLoggerService).inSingletonScope();
container.bind<IHealthService>(TYPES.HealthService).to(HealthService);
container.bind<HealthController>(TYPES.HealthController).to(HealthController);
container.bind<IEventPublisher>(TYPES.EventPublisher).to(RabbitMQEventPublisher).inSingletonScope();

container.bind<UserRegisteredProcessor>(TYPES.UserRegisteredProcessor).to(UserRegisteredProcessor);
container.bind<PasswordResetRequestedProcessor>(TYPES.PasswordResetRequestedProcessor).to(PasswordResetRequestedProcessor);
container.bind<IConsumer>(TYPES.UserEventsConsumer).to(UserEventsConsumer).inSingletonScope();

container.bind<IEmailService>(TYPES.EmailService).to(SmtpEmailService).inSingletonScope();
container.bind<ITemplateService>(TYPES.TemplateService).to(HandlebarsTemplateService).inSingletonScope();

export default container;

