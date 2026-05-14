import { MailDriverInterface, MailMessage, SendMailResult, MailAddress } from "../types.js";
import nodemailer, { Transporter } from "nodemailer";
import mailConfig, { MailerConfig } from "../mail.config.js";

/*
|--------------------------------------------------------------------------
| SMTP Mail Driver
|--------------------------------------------------------------------------
|
| This driver sends emails via SMTP using nodemailer.
|
*/

export class SmtpDriver implements MailDriverInterface {
  private transporter: Transporter;
  private config: MailerConfig;

  constructor(config?: MailerConfig) {
    this.config = config || mailConfig.mailers.smtp;
    this.transporter = this.createTransporter();
  }

  private createTransporter(): Transporter {
    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.encryption === "ssl",
      auth: {
        user: this.config.username,
        pass: this.config.password,
      },
      tls: this.config.encryption === "tls" ? { rejectUnauthorized: false } : undefined,
      connectionTimeout: (this.config.timeout || 30) * 1000,
    });
  }

  getName(): string {
    return "smtp";
  }

  async send(message: MailMessage): Promise<SendMailResult> {
    const mailOptions = this.buildMailOptions(message);
    const result = await this.transporter.sendMail(mailOptions);

    return {
      messageId: result.messageId,
      accepted: Array.isArray(result.accepted)
        ? result.accepted.map((a: string | object) => String(a))
        : [],
      rejected: Array.isArray(result.rejected)
        ? result.rejected.map((r: string | object) => String(r))
        : [],
      envelope: {
        from: result.envelope?.from || "",
        to: result.envelope?.to || [],
      },
      response: result.response,
    };
  }

  private buildMailOptions(message: MailMessage): nodemailer.SendMailOptions {
    return {
      from: this.formatAddress(message.from || mailConfig.from),
      to: this.formatAddresses(message.to),
      cc: message.cc ? this.formatAddresses(message.cc) : undefined,
      bcc: message.bcc ? this.formatAddresses(message.bcc) : undefined,
      replyTo: message.replyTo ? this.formatAddress(message.replyTo) : undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
        encoding: att.encoding as any,
        cid: att.cid,
      })),
      headers: message.headers,
      priority: message.priority,
    };
  }

  private formatAddress(address: MailAddress | string): string {
    if (typeof address === "string") {
      return address;
    }
    return address.name ? `"${address.name}" <${address.address}>` : address.address;
  }

  private formatAddresses(
    addresses: MailAddress | MailAddress[] | string | string[],
  ): string | string[] {
    if (Array.isArray(addresses)) {
      return addresses.map((a) => this.formatAddress(a));
    }
    return this.formatAddress(addresses);
  }

  /**
   * Verify the SMTP connection.
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
