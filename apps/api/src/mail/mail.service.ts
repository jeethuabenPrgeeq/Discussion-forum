import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly live = Boolean(process.env.SMTP_HOST);
  private readonly from = process.env.MAIL_FROM || 'NeuroLXP Forum <no-reply@neurolxp.local>';
  private readonly transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });

  async send({ to, subject, text, replyTo }: MailInput): Promise<boolean> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, replyTo });
      if (!this.live) this.logger.log(`mail preview -> ${to} | ${subject}\n${text}`);
      return true;
    } catch (error) {
      this.logger.error(`Could not send mail to ${to}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}