/*
|--------------------------------------------------------------------------
| Mail Types
|--------------------------------------------------------------------------
|
| Type definitions for the mail system.
|
*/

export interface MailAddress {
  address: string;
  name?: string;
}

export interface MailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
  cid?: string; // for inline attachments
}

export interface MailMessage {
  to: MailAddress | MailAddress[] | string | string[];
  from?: MailAddress | string;
  replyTo?: MailAddress | string;
  cc?: MailAddress | MailAddress[] | string | string[];
  bcc?: MailAddress | MailAddress[] | string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
  priority?: "high" | "normal" | "low";
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  envelope: {
    from: string;
    to: string[];
  };
  response?: string;
}

export interface MailDriverInterface {
  /**
   * Send a mail message.
   */
  send(message: MailMessage): Promise<SendMailResult>;

  /**
   * Get the driver name.
   */
  getName(): string;
}

export interface MailManagerInterface {
  /**
   * Get a mailer instance by name.
   */
  mailer(name?: string): MailerInterface;

  /**
   * Send a mailable.
   */
  send(mailable: MailableInterface): Promise<SendMailResult>;

  /**
   * Queue a mailable for sending.
   */
  queue(mailable: MailableInterface, queue?: string): Promise<string>;

  /**
   * Queue a mailable with delay.
   */
  later(mailable: MailableInterface, delay: number, queue?: string): Promise<string>;
}

export interface MailerInterface {
  /**
   * Set the recipients of the message.
   */
  to(address: MailAddress | MailAddress[] | string | string[]): this;

  /**
   * Set the CC recipients.
   */
  cc(address: MailAddress | MailAddress[] | string | string[]): this;

  /**
   * Set the BCC recipients.
   */
  bcc(address: MailAddress | MailAddress[] | string | string[]): this;

  /**
   * Set the reply-to address.
   */
  replyTo(address: MailAddress | string): this;

  /**
   * Send a mailable.
   */
  send(mailable: MailableInterface): Promise<SendMailResult>;

  /**
   * Queue a mailable.
   */
  queue(mailable: MailableInterface, queue?: string): Promise<string>;

  /**
   * Queue a mailable with delay.
   */
  later(mailable: MailableInterface, delay: number, queue?: string): Promise<string>;

  /**
   * Send a raw message.
   */
  raw(message: MailMessage): Promise<SendMailResult>;
}

export interface MailableInterface {
  /**
   * Build the message.
   */
  build(): this;

  /**
   * Get the message content.
   */
  toMailMessage(): MailMessage;

  /**
   * Set the locale for the mailable.
   */
  locale(locale: string): this;

  /**
   * Get the mailable display name.
   */
  displayName(): string;
}

export interface MailEventPayload {
  message: MailMessage;
  result?: SendMailResult;
  error?: Error;
  mailer: string;
  timestamp: Date;
}

export type MailEventType = "mail.sending" | "mail.sent" | "mail.failed" | "mail.queued";
