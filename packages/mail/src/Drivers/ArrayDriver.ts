import { MailDriverInterface, MailMessage, SendMailResult, MailAddress } from "../types.js";
import mailConfig from "../mail.config.js";
import crypto from "crypto";

/*
|--------------------------------------------------------------------------
| Array Mail Driver
|--------------------------------------------------------------------------
|
| This driver stores emails in an array for testing purposes.
| It doesn't send any actual emails.
|
*/

// In-memory storage for emails
const storedEmails: MailMessage[] = [];

export class ArrayDriver implements MailDriverInterface {
  getName(): string {
    return "array";
  }

  async send(message: MailMessage): Promise<SendMailResult> {
    const messageId = `<array-${crypto.randomUUID()}@localhost>`;
    const toAddresses = this.extractAddresses(message.to);

    // Store the message
    storedEmails.push({ ...message });

    return {
      messageId,
      accepted: toAddresses,
      rejected: [],
      envelope: {
        from: this.formatAddress(message.from || mailConfig.from),
        to: toAddresses,
      },
      response: "Message stored in array",
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
   * Get all stored emails.
   */
  static all(): MailMessage[] {
    return [...storedEmails];
  }

  /**
   * Get stored emails count.
   */
  static count(): number {
    return storedEmails.length;
  }

  /**
   * Clear all stored emails.
   */
  static flush(): void {
    storedEmails.length = 0;
  }

  /**
   * Get the first stored email.
   */
  static first(): MailMessage | undefined {
    return storedEmails[0];
  }

  /**
   * Get the last stored email.
   */
  static last(): MailMessage | undefined {
    return storedEmails[storedEmails.length - 1];
  }

  /**
   * Assert that an email was sent to a specific address.
   */
  static assertSentTo(email: string): boolean {
    return storedEmails.some((m) => {
      const toAddresses = this.prototype.extractAddresses.call(
        { extractAddresses: ArrayDriver.prototype.extractAddresses } as any,
        m.to,
      );
      return toAddresses.includes(email);
    });
  }

  /**
   * Assert that no emails were sent.
   */
  static assertNothingSent(): boolean {
    return storedEmails.length === 0;
  }
}
