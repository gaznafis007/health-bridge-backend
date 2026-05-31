import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendReportReadyOptions {
  to: string;
  patientName: string;
  centerName: string;
  reportToken: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.MAIL_FROM ?? 'noreply@healthbridge.com';
    this.appUrl = process.env.APP_URL ?? 'https://api.healthbridge.com';

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not set — MailService is running in degraded mode (emails will be skipped).',
      );
      this.resend = null;
      return;
    }

    this.resend = new Resend(apiKey);
  }

  async sendReportReady(opts: SendReportReadyOptions): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[MailService] Skipping report-ready email to ${opts.to} — Resend not configured.`,
      );
      return;
    }

    const downloadLink = `${this.appUrl}/lab/reports/token/${opts.reportToken}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: opts.to,
        subject: `Your lab report from ${opts.centerName} is ready`,
        html: `
          <p>Hi ${opts.patientName},</p>
          <p>Your lab report from <strong>${opts.centerName}</strong> is now available.</p>
          <p>
            <a href="${downloadLink}" style="
              display:inline-block;
              padding:10px 20px;
              background:#1a73e8;
              color:#fff;
              border-radius:4px;
              text-decoration:none;
              font-weight:bold;
            ">Download Report</a>
          </p>
          <p>Or copy this link: <a href="${downloadLink}">${downloadLink}</a></p>
          <p>This link does not require you to log in.</p>
          <p>— Health Bridge Team</p>
        `,
      });
    } catch (err) {
      this.logger.error(
        `[MailService] Failed to send report-ready email to ${opts.to}: ${(err as Error).message}`,
      );
    }
  }
}
