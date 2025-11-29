import { injectable, inject } from 'inversify';
import { ILogger } from '../../logging/logger.interface';
import { TYPES } from '../../types/di.types';
import { IEventProcessor } from './eventProcessor.interface';
import { IEmailService } from '../../services/email/emailService.interface';
import { ITemplateService } from '../../services/template/templateService.interface';
import { config } from '../../config/config';

export interface UserRegisteredData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string | Date;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  authProvider: string;
}

@injectable()
export class UserRegisteredProcessor implements IEventProcessor<UserRegisteredData> {
  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger,
    @inject(TYPES.EmailService) private readonly emailService: IEmailService,
    @inject(TYPES.TemplateService) private readonly templateService: ITemplateService
  ) {}

  async process(data: UserRegisteredData): Promise<void> {
    this.logger.info('Processing user.registered event', {
      userId: data.userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      createdAt: data.createdAt,
      authProvider: data.authProvider,
    });

    if (data.authProvider === 'local' && data.emailVerificationToken) {
      try {
        const verificationLink = `${config.emailVerificationBaseUrl}/verify-email?token=${data.emailVerificationToken}`;
        
        const htmlBody = await this.templateService.renderTemplate('email/email-verification.html', {
          verificationLink,
          firstName: data.firstName,
        });

        await this.emailService.sendEmail(
          data.email,
          'Verify your email address',
          htmlBody
        );

        this.logger.info('Email verification sent successfully', {
          userId: data.userId,
          email: data.email,
        });
      } catch (error) {
        this.logger.error('Failed to send email verification', error as Error, {
          userId: data.userId,
          email: data.email,
        });
      }
    } else {
      this.logger.info('Skipping email verification', {
        userId: data.userId,
        email: data.email,
        authProvider: data.authProvider,
        reason: data.authProvider !== 'local' ? 'OAuth provider - email pre-verified' : 'No verification token',
      });
    }
  }
}

