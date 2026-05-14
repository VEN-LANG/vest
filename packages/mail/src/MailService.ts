import {
  MailableInterface,
  MailAddress,
  MailDriverInterface,
  MailerInterface,
  MailEventPayload,
  MailManagerInterface,
  MailMessage,
  SendMailResult,
} from "./types.js";
import { ArrayDriver, FailoverDriver, LogDriver, SmtpDriver } from "./Drivers/index.js";
import mailConfig, { MailerConfig } from "./mail.config.js";
import { getEventDispatcher } from "@vest/events";

/** Optional SendMailJob class — registered by the app to avoid circular deps. */
let _sendMailJobClass: (new () => any) | null = null;
export function registerSendMailJob(jobClass: new () => any): void {
  _sendMailJobClass = jobClass;
}

/*
|--------------------------------------------------------------------------
| Mail Manager
|--------------------------------------------------------------------------
|
| The MailManager is responsible for managing mail "mailers" which are
| essentially mail transport configurations. This manager supports
| multiple mail backends via a single, unified API.
|
*/

export class MailManager implements MailManagerInterface {
  private static instance: MailManager | null = null;
  private drivers: Map<string, MailDriverInterface> = new Map();
  private mailers: Map<string, Mailer> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(): MailManager {
    if (!MailManager.instance) {
      MailManager.instance = new MailManager();
    }
    return MailManager.instance;
  }

  /**
   * Get a mailer instance.
   */
  mailer(name?: string): Mailer {
    const mailerName = name || mailConfig.default;

    if (!this.mailers.has(mailerName)) {
      const driver = this.createDriver(mailerName);
      this.mailers.set(mailerName, new Mailer(driver, mailerName));
    }

    return this.mailers.get(mailerName)!;
  }

  /**
   * Create a driver instance.
   */
  private createDriver(name: string): MailDriverInterface {
    if (this.drivers.has(name)) {
      return this.drivers.get(name)!;
    }

    const config = mailConfig.mailers[name];
    if (!config) {
      throw new Error(`Mail driver [${name}] is not configured.`);
    }

    return this.createDriverFromConfig(name, config);
  }

  /**
   * Create a driver instance from config.
   */
  private createDriverFromConfig(name: string, config: MailerConfig): MailDriverInterface {
    if (this.drivers.has(name)) {
      return this.drivers.get(name)!;
    }

    let driver: MailDriverInterface;

    switch (config.transport) {
      case "smtp":
        driver = new SmtpDriver(config);
        break;
      case "log":
        driver = new LogDriver(config.channel);
        break;
      case "array":
        driver = new ArrayDriver();
        break;
      case "failover":
        const failover = new FailoverDriver(config, (n: string) => this.createDriver(n));
        driver = failover;
        break;
      case "sendmail":
      case "ses":
      case "mailgun":
      case "postmark":
        // These could be implemented with additional packages
        console.warn(
          `[Mail] Driver ${config.transport} not fully implemented, falling back to log`,
        );
        driver = new LogDriver();
        break;
      default:
        throw new Error(`Unsupported mail transport: ${config.transport}`);
    }

    this.drivers.set(name, driver);
    return driver;
  }

  /**
   * Send a mailable using the default mailer.
   */
  async send(mailable: MailableInterface): Promise<SendMailResult> {
    const mailerName = (mailable as any).getMailer?.() || mailConfig.default;
    return this.mailer(mailerName).send(mailable);
  }

  /**
   * Queue a mailable for sending.
   */
  async queue(mailable: MailableInterface, queue?: string): Promise<string> {
    return this.mailer().queue(mailable, queue);
  }

  /**
   * Queue a mailable with delay.
   */
  async later(mailable: MailableInterface, delay: number, queue?: string): Promise<string> {
    return this.mailer().later(mailable, delay, queue);
  }

  /**
   * Extend the manager with a custom driver.
   */
  extend(name: string, driver: MailDriverInterface): this {
    this.drivers.set(name, driver);
    return this;
  }

  /**
   * Get the default mailer name.
   */
  getDefaultDriver(): string {
    return mailConfig.default;
  }

  /**
   * Create a mailer with custom configuration.
   */
  async withConfig(config: Partial<MailerConfig>): Promise<Mailer> {
    const tempMailerName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseConfig = mailConfig.mailers[mailConfig.default];
    const mergedConfig = { ...baseConfig, ...config } as MailerConfig;

    const driver = this.createDriverFromConfig(tempMailerName, mergedConfig);
    return new Mailer(driver, tempMailerName);
  }
}

/*
|--------------------------------------------------------------------------
| Mailer Class
|--------------------------------------------------------------------------
|
| The Mailer class is responsible for sending emails using a specific
| driver. It provides a fluent interface for building and sending emails.
|
*/

export class Mailer implements MailerInterface {
  private _to: MailAddress[] = [];
  private _cc: MailAddress[] = [];
  private _bcc: MailAddress[] = [];
  private _replyTo?: MailAddress;
  private driver: MailDriverInterface;
  private name: string;

  constructor(driver: MailDriverInterface, name: string) {
    this.driver = driver;
    this.name = name;
  }

  /**
   * Set the recipients.
   */
  to(address: MailAddress | MailAddress[] | string | string[]): this {
    this._to = this.normalizeAddresses(address);
    return this;
  }

  /**
   * Set the CC recipients.
   */
  cc(address: MailAddress | MailAddress[] | string | string[]): this {
    this._cc = this.normalizeAddresses(address);
    return this;
  }

  /**
   * Set the BCC recipients.
   */
  bcc(address: MailAddress | MailAddress[] | string | string[]): this {
    this._bcc = this.normalizeAddresses(address);
    return this;
  }

  /**
   * Set the reply-to address.
   */
  replyTo(address: MailAddress | string): this {
    this._replyTo = typeof address === "string" ? { address } : address;
    return this;
  }

  /**
   * Send a mailable.
   */
  async send(mailable: MailableInterface): Promise<SendMailResult> {
    const message = mailable.toMailMessage();

    // Apply any recipients set on the mailer
    if (this._to.length > 0) {
      message.to = this._to;
    }
    if (this._cc.length > 0) {
      message.cc = this._cc;
    }
    if (this._bcc.length > 0) {
      message.bcc = this._bcc;
    }
    if (this._replyTo) {
      message.replyTo = this._replyTo;
    }

    return this.raw(message);
  }

  /**
   * Queue a mailable for background sending.
   */
  async queue(mailable: MailableInterface, queue?: string): Promise<string> {
    const { dispatch } = await import("@vest/queue");
    const message = mailable.toMailMessage();
    const SendMailJobClass = _sendMailJobClass;
    if (!SendMailJobClass) {
      throw new Error("SendMailJob not registered. Call MailService.registerSendMailJob() first.");
    }
    const job = (SendMailJobClass as any).make({ message, mailer: this.name });
    const pending = dispatch(job);
    if (queue) pending.onQueue(queue);
    await this.fireEvent("mail.queued", message);
    return pending.dispatch();
  }

  /**
   * Queue a mailable with delay.
   */
  async later(mailable: MailableInterface, delay: number, queue?: string): Promise<string> {
    const { dispatch } = await import("@vest/queue");

    const message = mailable.toMailMessage();
    const SendMailJobClass = _sendMailJobClass;
    if (!SendMailJobClass) {
      throw new Error("SendMailJob not registered. Call MailService.registerSendMailJob() first.");
    }
    const job = (SendMailJobClass as any).make({ message, mailer: this.name });

    const pending = dispatch(job).delay(delay);
    if (queue) {
      pending.onQueue(queue);
    }

    await this.fireEvent("mail.queued", message);

    return pending.dispatch();
  }

  /**
   * Send a raw mail message.
   */
  async raw(message: MailMessage): Promise<SendMailResult> {
    // Fire sending event
    await this.fireEvent("mail.sending", message);

    try {
      const result = await this.driver.send(message);

      // Fire sent event
      await this.fireEvent("mail.sent", message, result);

      // Reset state
      this.reset();

      return result;
    } catch (error) {
      // Fire failed event
      await this.fireEvent("mail.failed", message, undefined, error as Error);

      throw error;
    }
  }

  /**
   * Fire a mail event.
   */
  private async fireEvent(
    type: string,
    message: MailMessage,
    result?: SendMailResult,
    error?: Error,
  ): Promise<void> {
    const payload: MailEventPayload = {
      message,
      result,
      error,
      mailer: this.name,
      timestamp: new Date(),
    };

    try {
      await getEventDispatcher().dispatch(type, payload);
    } catch (e) {
      console.error(`[Mail] Error firing event ${type}:`, e);
    }
  }

  /**
   * Reset the mailer state.
   */
  private reset(): void {
    this._to = [];
    this._cc = [];
    this._bcc = [];
    this._replyTo = undefined;
  }

  /**
   * Normalize addresses to MailAddress array.
   */
  private normalizeAddresses(
    addresses: MailAddress | MailAddress[] | string | string[],
  ): MailAddress[] {
    const arr = Array.isArray(addresses) ? addresses : [addresses];
    return arr.map((a) => (typeof a === "string" ? { address: a } : a));
  }
}

/*
|--------------------------------------------------------------------------
| Mail Facade / Helper
|--------------------------------------------------------------------------
*/

/**
 * Get the mail manager instance.
 */
export function Mail(): MailManager {
  return MailManager.getInstance();
}

/**
 * Create a mailer with custom configuration.
 */
export async function MailWithConfig(config: Partial<MailerConfig>): Promise<Mailer> {
  return Mail().withConfig(config);
}

/**
 * Send a mailable.
 */
export async function sendMail(mailable: MailableInterface): Promise<SendMailResult> {
  return Mail().send(mailable);
}

/**
 * Queue a mailable.
 */
export async function queueMail(mailable: MailableInterface, queue?: string): Promise<string> {
  return Mail().queue(mailable, queue);
}

/**
 * Create a new mailable and send it.
 */
export async function mail(
  to: string | string[],
  subject: string,
  content: string,
  options?: {
    html?: boolean;
    from?: string | MailAddress;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: any[];
  },
): Promise<SendMailResult> {
  const message: MailMessage = {
    to: Array.isArray(to) ? to.map((t) => ({ address: t })) : [{ address: to }],
    subject,
    ...(options?.html ? { html: content } : { text: content }),
    from: options?.from
      ? typeof options.from === "string"
        ? { address: options.from }
        : options.from
      : mailConfig.from,
    cc: options?.cc
      ? Array.isArray(options.cc)
        ? options.cc.map((c) => ({ address: c }))
        : [{ address: options.cc }]
      : undefined,
    bcc: options?.bcc
      ? Array.isArray(options.bcc)
        ? options.bcc.map((b) => ({ address: b }))
        : [{ address: options.bcc }]
      : undefined,
    attachments: options?.attachments,
  };

  return Mail().mailer().raw(message);
}

// Legacy export for backward compatibility
export const MailService = {
  getInstance: () => MailManager.getInstance(),
  mailer: (name?: string) => Mail().mailer(name),
  send: (mailable: MailableInterface) => Mail().send(mailable),
  queue: (mailable: MailableInterface, queue?: string) => Mail().queue(mailable, queue),
  later: (mailable: MailableInterface, delay: number, queue?: string) =>
    Mail().later(mailable, delay, queue),
};
