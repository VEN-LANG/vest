import { MailableInterface, MailMessage, MailAddress, MailAttachment } from "./types.js";
import mailConfig from "./mail.config.js";

/*
|--------------------------------------------------------------------------
| Mailable Base Class
|--------------------------------------------------------------------------
|
| This class provides a clean, fluent interface for building email messages.
| Extend this class to create your own mailables.
|
*/

export abstract class Mailable implements MailableInterface {
  /*
    |--------------------------------------------------------------------------
    | Message Properties
    |--------------------------------------------------------------------------
    */

  protected _to: MailAddress[] = [];
  protected _cc: MailAddress[] = [];
  protected _bcc: MailAddress[] = [];
  protected _from?: MailAddress;
  protected _replyTo?: MailAddress;
  protected _subject: string = "";
  protected _text?: string;
  protected _html?: string;
  protected _attachments: MailAttachment[] = [];
  protected _headers: Record<string, string> = {};
  protected _priority: "high" | "normal" | "low" = "normal";
  protected _tags: string[] = [];
  protected _metadata: Record<string, any> = {};
  protected _locale: string = "en";
  protected _mailer?: string;
  protected _theme: string = "default";

  /*
    |--------------------------------------------------------------------------
    | View Data
    |--------------------------------------------------------------------------
    */

  protected viewData: Record<string, any> = {};

  /*
    |--------------------------------------------------------------------------
    | Abstract Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Build the message.
   * Override this in your mailable class.
   */
  abstract build(): this;

  /*
    |--------------------------------------------------------------------------
    | Fluent Setters
    |--------------------------------------------------------------------------
    */

  /**
   * Set the recipients of the message.
   */
  to(address: string | MailAddress | Array<string | MailAddress>): this {
    this._to = this.normalizeAddresses(address);
    return this;
  }

  /**
   * Set the CC recipients.
   */
  cc(address: string | MailAddress | Array<string | MailAddress>): this {
    this._cc = this.normalizeAddresses(address);
    return this;
  }

  /**
   * Set the BCC recipients.
   */
  bcc(address: string | MailAddress | Array<string | MailAddress>): this {
    this._bcc = this.normalizeAddresses(address);
    return this;
  }

  /**
   * Set the sender of the message.
   */
  from(address: string | MailAddress, name?: string): this {
    this._from = this.normalizeAddress(address, name);
    return this;
  }

  /**
   * Set the reply-to address.
   */
  replyTo(address: string | MailAddress, name?: string): this {
    this._replyTo = this.normalizeAddress(address, name);
    return this;
  }

  /**
   * Set the subject of the message.
   */
  subject(subject: string): this {
    this._subject = subject;
    return this;
  }

  /**
   * Set the plain text content.
   */
  text(content: string): this {
    this._text = content;
    return this;
  }

  /**
   * Set the HTML content.
   */
  html(content: string): this {
    this._html = content;
    return this;
  }

  /**
   * Set the view for the message (HTML template).
   */
  view(template: string, data?: Record<string, any>): this {
    // Simple template rendering - replace {{ key }} with values
    let html = template;
    const mergedData = { ...this.viewData, ...data };

    for (const [key, value] of Object.entries(mergedData)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      html = html.replace(regex, String(value ?? ""));
    }

    this._html = html;
    return this;
  }

  /**
   * Add data to be used in the view.
   */
  with(key: string | Record<string, any>, value?: any): this {
    if (typeof key === "object") {
      this.viewData = { ...this.viewData, ...key };
    } else {
      this.viewData[key] = value;
    }
    return this;
  }

  /**
   * Attach a file to the message.
   */
  attach(pathOrAttachment: string | MailAttachment, options?: Partial<MailAttachment>): this {
    if (typeof pathOrAttachment === "string") {
      this._attachments.push({
        path: pathOrAttachment,
        filename: options?.filename || pathOrAttachment.split("/").pop() || "attachment",
        ...options,
      });
    } else {
      this._attachments.push(pathOrAttachment);
    }
    return this;
  }

  /**
   * Attach raw data as a file.
   */
  attachData(data: Buffer | string, filename: string, options?: Partial<MailAttachment>): this {
    this._attachments.push({
      content: data,
      filename,
      ...options,
    });
    return this;
  }

  /**
   * Add a custom header.
   */
  header(name: string, value: string): this {
    this._headers[name] = value;
    return this;
  }

  /**
   * Set the message priority.
   */
  priority(priority: "high" | "normal" | "low"): this {
    this._priority = priority;
    return this;
  }

  /**
   * Add tags to the message (for tracking).
   */
  tag(tags: string | string[]): this {
    if (Array.isArray(tags)) {
      this._tags.push(...tags);
    } else {
      this._tags.push(tags);
    }
    return this;
  }

  /**
   * Add metadata to the message.
   */
  metadata(key: string | Record<string, any>, value?: any): this {
    if (typeof key === "object") {
      this._metadata = { ...this._metadata, ...key };
    } else {
      this._metadata[key] = value;
    }
    return this;
  }

  /**
   * Set the locale for the mailable.
   */
  locale(locale: string): this {
    this._locale = locale;
    return this;
  }

  /**
   * Set the mailer to use.
   */
  mailer(mailer: string): this {
    this._mailer = mailer;
    return this;
  }

  /**
   * Set the theme for markdown emails.
   */
  theme(theme: string): this {
    this._theme = theme;
    return this;
  }

  /*
    |--------------------------------------------------------------------------
    | Conversion Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Convert the mailable to a mail message.
   */
  toMailMessage(): MailMessage {
    // Ensure build() has been called
    this.build();

    return {
      to: this._to,
      from: this._from || mailConfig.from,
      replyTo: this._replyTo,
      cc: this._cc.length > 0 ? this._cc : undefined,
      bcc: this._bcc.length > 0 ? this._bcc : undefined,
      subject: this._subject,
      text: this._text,
      html: this._html,
      attachments: this._attachments.length > 0 ? this._attachments : undefined,
      headers: Object.keys(this._headers).length > 0 ? this._headers : undefined,
      priority: this._priority,
      tags: this._tags.length > 0 ? this._tags : undefined,
      metadata: Object.keys(this._metadata).length > 0 ? this._metadata : undefined,
    };
  }

  /**
   * Get the display name for this mailable.
   */
  displayName(): string {
    return this.constructor.name;
  }

  /**
   * Get the mailer name to use.
   */
  getMailer(): string | undefined {
    return this._mailer;
  }

  /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

  protected normalizeAddress(address: string | MailAddress, name?: string): MailAddress {
    if (typeof address === "string") {
      return { address, name };
    }
    return address;
  }

  protected normalizeAddresses(
    addresses: string | MailAddress | Array<string | MailAddress>,
  ): MailAddress[] {
    const arr = Array.isArray(addresses) ? addresses : [addresses];
    return arr.map((a) => this.normalizeAddress(a));
  }
}

/*
|--------------------------------------------------------------------------
| Simple Mailables for Quick Use
|--------------------------------------------------------------------------
*/

/**
 * A simple text email mailable.
 */
export class TextMailable extends Mailable {
  constructor(
    private _textContent: string,
    private _subjectLine: string,
  ) {
    super();
  }

  build(): this {
    return this.subject(this._subjectLine).text(this._textContent);
  }
}

/**
 * A simple HTML email mailable.
 */
export class HtmlMailable extends Mailable {
  constructor(
    private _htmlContent: string,
    private _subjectLine: string,
  ) {
    super();
  }

  build(): this {
    return this.subject(this._subjectLine).html(this._htmlContent);
  }
}
