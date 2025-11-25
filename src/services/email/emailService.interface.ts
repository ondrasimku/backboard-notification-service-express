export interface IEmailService {
  sendEmail(to: string, subject: string, htmlBody: string): Promise<void>;
}

