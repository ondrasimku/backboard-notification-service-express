import { injectable, inject } from 'inversify';
import { ILogger } from '../../logging/logger.interface';
import { TYPES } from '../../types/di.types';
import { IEventProcessor } from './eventProcessor.interface';
import { IEmailService } from '../../services/email/emailService.interface';
import { ITemplateService } from '../../services/template/templateService.interface';
import { config } from '../../config/config';

export interface PasswordResetRequestedData {
  userId: string;
  email: string;
  token: string;
  expiresAt: string | Date;
}

@injectable()
export class PasswordResetRequestedProcessor implements IEventProcessor<PasswordResetRequestedData> {
  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger,
    @inject(TYPES.EmailService) private readonly emailService: IEmailService,
    @inject(TYPES.TemplateService) private readonly templateService: ITemplateService
  ) {}

  async process(data: PasswordResetRequestedData): Promise<void> {
    this.logger.info('Processing user.password-change-requested event', {
      userId: data.userId,
      email: data.email,
      token: data.token,
      expiresAt: data.expiresAt,
    });

    const resetLink = `${config.resetPasswordBaseUrl}/reset-password?token=${data.token}`;
    
    const htmlBody = await this.templateService.renderTemplate('email/password-reset.html', {
      resetLink,
    });

    await this.emailService.sendEmail(
      data.email,
      'Password Reset Request',
      htmlBody
    );
  }
}

