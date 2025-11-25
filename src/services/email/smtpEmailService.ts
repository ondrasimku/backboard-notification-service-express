import { injectable, inject } from 'inversify';
import nodemailer, { Transporter } from 'nodemailer';
import { ILogger } from '../../logging/logger.interface';
import { TYPES } from '../../types/di.types';
import { IEmailService } from './emailService.interface';
import { config } from '../../config/config';

@injectable()
export class SmtpEmailService implements IEmailService {
  private transporter: Transporter;

  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) {
    const secure = this.determineSecureFlag(config.smtp.port, config.smtp.secure);
    
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  private determineSecureFlag(port: number, configuredSecure: boolean): boolean {
    if (port === 587) {
      return false;
    }
    if (port === 465) {
      return true;
    }
    return configuredSecure;
  }

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        html: htmlBody,
      });

      this.logger.info('Email sent successfully', {
        messageId: info.messageId,
        to,
        subject,
      });
    } catch (error) {
      this.logger.error('Failed to send email', error as Error, {
        to,
        subject,
      });
      throw error;
    }
  }
}

