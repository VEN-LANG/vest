import { MailDriverInterface, MailMessage, SendMailResult, MailAddress } from "../types.js";
import mailConfig from "../mail.config.js";
import crypto from "crypto";

/*
|--------------------------------------------------------------------------
| Log Mail Driver
|--------------------------------------------------------------------------
|
| This driver logs emails instead of sending them. Useful for development
| and testing environments.
|
*/

// In-memory storage for logged emails (useful for testing)
const loggedEmails: Array<{ timestamp: Date; message: MailMessage; messageId: string }> = [];

export class LogDriver implements MailDriverInterface {
  private channel: string;

  constructor(channel?: string) {
    this.channel = channel || mailConfig.mailers.log?.channel || "default";
  }

  getName(): string {
    return "log";
  }

  async send(message: MailMessage): Promise<SendMailResult> {
    const messageId = `<log-${crypto.randomUUID()}@localhost>`;
    const toAddresses = this.extractAddresses(message.to);

    // Log to console
    console.log("");
    console.log("=".repeat(60));
    console.log(`[Mail Log] ${new Date().toISOString()}`);
    console.log("=".repeat(60));
    console.log(`Message ID: ${messageId}`);
    console.log(`Channel: ${this.channel}`);
    console.log("-".repeat(60));
    console.log(`From: ${this.formatAddress(message.from || mailConfig.from)}`);
    console.log(`To: ${toAddresses.join(", ")}`);
    if (message.cc) {
      console.log(`CC: ${this.extractAddresses(message.cc).join(", ")}`);
    }
    if (message.bcc) {
      console.log(`BCC: ${this.extractAddresses(message.bcc).join(", ")}`);
    }
    if (message.replyTo) {
      console.log(`Reply-To: ${this.formatAddress(message.replyTo)}`);
    }
    console.log(`Subject: ${message.subject}`);
    console.log("-".repeat(60));
    if (message.text) {
      console.log("Text Body:");
      console.log(message.text);
    }
    if (message.html) {
      console.log("-".repeat(60));
      console.log("HTML Body:");
      console.log(message.html);
    }
    if (message.attachments && message.attachments.length > 0) {
      console.log("-".repeat(60));
      console.log("Attachments:");
      message.attachments.forEach((att) => {
        console.log(`  - ${att.filename} (${att.contentType || "application/octet-stream"})`);
      });
    }
    console.log("=".repeat(60));
    console.log("");

    // Store in memory for testing
    loggedEmails.push({
      timestamp: new Date(),
      message,
      messageId,
    });

    return {
      messageId,
      accepted: toAddresses,
      rejected: [],
      envelope: {
        from: this.formatAddress(message.from || mailConfig.from),
        to: toAddresses,
      },
      response: "Message logged successfully",
    };
  }

  private formatAddress(address: MailAddress | string): string {
    if (typeof address === "string") {
      return address;
    }
    return address.name ? `"${address.name}" <${address.address}>` : address.address;
  }

  private extractAddresses(addresses: MailAddress | MailAddress[] | string | string[]): string[] {
    if (Array.isArray(addresses)) {
      return addresses.map((a) => {
        if (typeof a === "string") return a;
        return a.address;
      });
    }
    if (typeof addresses === "string") {
      return [addresses];
    }
    return [addresses.address];
  }

  /**
   * Get all logged emails (for testing).
   */
  static getLoggedEmails(): Array<{ timestamp: Date; message: MailMessage; messageId: string }> {
    return [...loggedEmails];
  }

  /**
   * Clear logged emails (for testing).
   */
  static clearLoggedEmails(): void {
    loggedEmails.length = 0;
  }

  /**
   * Get the last logged email (for testing).
   */
  static getLastEmail(): { timestamp: Date; message: MailMessage; messageId: string } | undefined {
    return loggedEmails[loggedEmails.length - 1];
  }
}
