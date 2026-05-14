import crypto from "crypto";
import { SerializedJob, JobOptions } from "./types.js";
import queueConfig from "./queue.config.js";

/*
|--------------------------------------------------------------------------
| Payload Encryption Helpers
|--------------------------------------------------------------------------
| AES-256-GCM encryption for job payloads when shouldBeEncrypted = true.
| Uses APP_KEY from environment, same pattern as auth.ts.
*/

let _encryptionKey: Buffer | undefined;
function getEncryptionKey(): Buffer {
  if (_encryptionKey) return _encryptionKey;
  const raw = process.env.APP_KEY;
  if (!raw) throw new Error("APP_KEY is not set — cannot encrypt job payload.");
  const stripped = raw.replace(/^base64:/, "");
  const decoded = Buffer.from(stripped, "base64");
  _encryptionKey =
    decoded.length === 32 ? decoded : crypto.createHash("sha256").update(decoded).digest();
  return _encryptionKey;
}

export function encryptPayload(data: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted].join(":");
}

export function decryptPayload(data: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, encrypted] = data.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/*
|--------------------------------------------------------------------------
| Job Base Class
|--------------------------------------------------------------------------
|
| This is the base class for all queueable jobs. It provides the
| serialization, deserialization, and dispatch functionality.
|
*/

// Global job registry
const jobRegistry: Map<string, new () => Job> = new Map();

export function registerJob(name: string, jobClass: new () => Job): void {
  jobRegistry.set(name, jobClass);
}

export function getJobClass(name: string): (new () => Job) | undefined {
  return jobRegistry.get(name);
}

export function getRegisteredJobs(): Map<string, new () => Job> {
  return jobRegistry;
}

// Decorator to auto-register jobs
export function Queueable(name?: string) {
  return function <T extends new (...args: any[]) => Job>(constructor: T) {
    const jobName = name || constructor.name;
    registerJob(jobName, constructor as unknown as new () => Job);
    return constructor;
  };
}

export abstract class Job {
  /*
    |--------------------------------------------------------------------------
    | Job Configuration
    |--------------------------------------------------------------------------
    */

  /**
   * The name of the queue the job should be sent to.
   */
  public queue: string = "default";

  /**
   * The name of the connection the job should be sent to.
   */
  public connection: string = queueConfig.default;

  /**
   * The number of times the job may be attempted.
   */
  public tries: number = queueConfig.defaults.tries;

  /**
   * The maximum number of unhandled exceptions to allow before failing.
   */
  public maxExceptions: number = queueConfig.defaults.maxExceptions;

  /**
   * The number of seconds the job can run before timing out.
   */
  public timeout: number = queueConfig.defaults.timeout;

  /**
   * The number of seconds to wait before retrying the job.
   */
  public backoff: number | number[] = queueConfig.defaults.backoff;

  /**
   * Indicate if the job should be encrypted.
   */
  public shouldBeEncrypted: boolean = false;

  /**
   * The unique ID of the job (for unique jobs).
   */
  public uniqueId?: string;

  /**
   * The number of seconds the unique lock should be held.
   */
  public uniqueFor?: number;

  /**
   * Number of seconds to delay the job.
   */
  public delay: number = 0;

  /**
   * Job UUID.
   */
  private _uuid: string = "";

  /**
   * Current attempt number.
   */
  private _attempts: number = 0;

  /*
    |--------------------------------------------------------------------------
    | Abstract Methods
    |--------------------------------------------------------------------------
    */

  /**
   * Execute the job.
   */
  abstract handle(): Promise<void>;

  /*
    |--------------------------------------------------------------------------
    | Job Lifecycle Hooks
    |--------------------------------------------------------------------------
    */

  /**
   * Handle a job failure.
   */
  failed(exception: Error): void {
    // Override in subclass to handle failures
  }

  /**
   * Determine the time at which the job should timeout.
   */
  retryUntil(): Date | null {
    return null;
  }

  /**
   * Get the middleware the job should pass through.
   */
  middleware(): any[] {
    return [];
  }

  /**
   * Get the tags that should be assigned to the job.
   */
  tags(): string[] {
    return [];
  }

  /*
    |--------------------------------------------------------------------------
    | Getters
    |--------------------------------------------------------------------------
    */

  get uuid(): string {
    return this._uuid;
  }

  get attempts(): number {
    return this._attempts;
  }

  /*
    |--------------------------------------------------------------------------
    | Serialization
    |--------------------------------------------------------------------------
    */

  /**
   * Get the display name for the queued job.
   */
  displayName(): string {
    return this.constructor.name;
  }

  /**
   * Prepare the job for serialization.
   */
  protected getSerializableProperties(): Record<string, any> {
    const props: Record<string, any> = {};

    // Get all own properties except private ones
    for (const key of Object.keys(this)) {
      if (!key.startsWith("_")) {
        props[key] = (this as any)[key];
      }
    }

    return props;
  }

  /**
   * Serialize the job to a format that can be stored.
   */
  serialize(): SerializedJob {
    const uuid = this._uuid || crypto.randomUUID();
    this._uuid = uuid;

    const retryUntilDate = this.retryUntil();
    const rawData = JSON.stringify(this.getSerializableProperties());

    return {
      id: crypto.randomUUID(),
      uuid,
      displayName: this.displayName(),
      job: this.constructor.name,
      data: this.shouldBeEncrypted ? encryptPayload(rawData) : rawData,
      encrypted: this.shouldBeEncrypted,
      queue: this.queue,
      attempts: this._attempts,
      maxTries: this.tries,
      maxExceptions: this.maxExceptions,
      exceptionCount: 0,
      timeout: this.timeout,
      backoff: this.backoff,
      retryUntil: retryUntilDate ? retryUntilDate.getTime() : null,
      createdAt: Date.now(),
      availableAt: Date.now() + this.delay * 1000,
      reservedAt: null,
    };
  }

  /**
   * Restore the job from serialized data.
   */
  static deserialize<T extends Job>(serialized: SerializedJob): T | null {
    const JobClass = getJobClass(serialized.job);

    if (!JobClass) {
      console.error(
        `Job class "${serialized.job}" not found in registry. Make sure to use @Queueable decorator.`,
      );
      return null;
    }

    const instance = new JobClass() as T;

    let rawData = serialized.data;
    if (serialized.encrypted) {
      try {
        rawData = decryptPayload(rawData);
      } catch (e) {
        console.error(`[Job] Failed to decrypt payload for ${serialized.job}:`, e);
        return null;
      }
    }

    const data = JSON.parse(rawData);

    for (const [key, value] of Object.entries(data)) {
      (instance as any)[key] = value;
    }

    (instance as any)._uuid = serialized.uuid;
    (instance as any)._attempts = serialized.attempts;

    return instance;
  }

  /*
    |--------------------------------------------------------------------------
    | Dispatching
    |--------------------------------------------------------------------------
    */

  /**
   * Dispatch the job with the given arguments.
   */
  static dispatch<T extends Job>(this: new () => T, ...args: any[]): PendingDispatch<T> {
    const job = new this();
    return new PendingDispatch(job);
  }

  /**
   * Dispatch the job synchronously.
   */
  static dispatchSync<T extends Job>(this: new () => T): Promise<void> {
    const job = new this();
    return job.handle();
  }

  /**
   * Dispatch the job after the response is sent.
   */
  static dispatchAfterResponse<T extends Job>(this: new () => T): PendingDispatch<T> {
    const job = new this();
    return new PendingDispatch(job).afterResponse();
  }

  /*
    |--------------------------------------------------------------------------
    | Fluent Configuration Methods
    |--------------------------------------------------------------------------
    */

  onQueue(queue: string): this {
    this.queue = queue;
    return this;
  }

  onConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

  withDelay(seconds: number): this {
    this.delay = seconds;
    return this;
  }

  withTries(tries: number): this {
    this.tries = tries;
    return this;
  }

  withTimeout(seconds: number): this {
    this.timeout = seconds;
    return this;
  }

  withBackoff(backoff: number | number[]): this {
    this.backoff = backoff;
    return this;
  }
}

/*
|--------------------------------------------------------------------------
| Pending Dispatch
|--------------------------------------------------------------------------
|
| This class represents a job that is pending dispatch and allows
| for fluent configuration before actually dispatching.
|
*/

export class PendingDispatch<T extends Job> {
  private _afterResponse: boolean = false;

  constructor(private job: T) {}

  onQueue(queue: string): this {
    this.job.onQueue(queue);
    return this;
  }

  onConnection(connection: string): this {
    this.job.onConnection(connection);
    return this;
  }

  delay(seconds: number): this {
    this.job.withDelay(seconds);
    return this;
  }

  tries(n: number): this {
    this.job.withTries(n);
    return this;
  }

  timeout(seconds: number): this {
    this.job.withTimeout(seconds);
    return this;
  }

  backoff(b: number | number[]): this {
    this.job.withBackoff(b);
    return this;
  }

  maxExceptions(n: number): this {
    this.job.maxExceptions = n;
    return this;
  }

  afterResponse(): this {
    this._afterResponse = true;
    return this;
  }

  async dispatch(): Promise<string> {
    const { Queue } = await import("./Queue.js");

    if (this._afterResponse) {
      setImmediate(async () => {
        await Queue.push(this.job);
      });
      return this.job.uuid;
    }

    return Queue.push(this.job);
  }
}

/*
|--------------------------------------------------------------------------
| Helper Function
|--------------------------------------------------------------------------
*/

export function dispatch<T extends Job>(job: T): PendingDispatch<T> {
  return new PendingDispatch(job);
}
