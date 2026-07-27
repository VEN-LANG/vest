import { createClient, RedisClientType } from "redis";
import {
  QueueDriverInterface,
  FailedJobsInterface,
  SerializedJob,
  QueueConnectionConfig,
} from "../types.js";
import {
  defaultPrefixFor,
  getQueueConfig,
  parseQueueName,
  resolvePrefix,
} from "../namespace.js";

/*
|--------------------------------------------------------------------------
| Redis Queue Driver
|--------------------------------------------------------------------------
|
| Uses Redis data structures for high-performance job processing:
|   - Main queue:   List  (RPUSH / LPOP)
|   - Delayed jobs: ZSet  scored by availableAt (ms), member = uuid
|   - Reserved:     Hash  keyed by uuid → full payload JSON
|   - Delayed body: Hash  keyed by uuid → full payload JSON
|   - Failed jobs:  Hash  keyed by uuid → failed job JSON
|
| UUID-keyed reserved / delayed body hashes eliminate the fragile
| "payload must exactly match" issue that plagued the old ZSet approach.
|
| Every key is namespaced by the owning application:
|
|   <prefix>:<queue>[:<suffix>]        e.g. billing_queue:emails:reserved
|
| so that multiple services sharing one Redis instance never pop each
| other's jobs. Pass a queue name of the form `queue@app` to deliberately
| address a sibling application's queue.
|
*/

export type RedisDriverConfig = Pick<
  QueueConnectionConfig,
  | "queue"
  | "retry_after"
  | "prefix"
  | "app"
  | "apps"
  | "url"
  | "host"
  | "port"
  | "password"
  | "username"
  | "database"
>;

export class RedisDriver implements QueueDriverInterface, FailedJobsInterface {
  private client: RedisClientType | null = null;
  private defaultQueue: string;
  private retryAfter: number;
  private prefix: string;
  private apps: Record<string, string>;
  private connectionConfig: RedisDriverConfig;
  private initialized: boolean = false;

  constructor(config?: RedisDriverConfig) {
    // Read through getQueueConfig() so an application override registered via
    // setConfig('queue', …) wins over this package's bundled defaults.
    const redisConfig = getQueueConfig().connections.redis ?? {};
    const merged: RedisDriverConfig = { ...redisConfig, ...config };

    this.connectionConfig = merged;
    this.defaultQueue = merged.queue || "default";
    this.retryAfter = merged.retry_after || 90;
    this.prefix = resolvePrefix(merged);
    this.apps = merged.apps ?? {};
  }

  /** The Redis key prefix this driver writes under. */
  getPrefix(): string {
    return this.prefix;
  }

  /** Resolve the key prefix for a sibling application. */
  private prefixForApp(app: string): string {
    return this.apps[app] ?? defaultPrefixFor(app);
  }

  /**
   * Build a namespaced Redis key. Queue names of the form `queue@app` are
   * routed to that application's prefix instead of our own.
   */
  private key(queue: string, suffix: string = ""): string {
    const { queue: bare, app } = parseQueueName(queue);
    const prefix = app ? this.prefixForApp(app) : this.prefix;
    const base = `${prefix}:${bare}`;
    return suffix ? `${base}:${suffix}` : base;
  }

  async init(): Promise<void> {
    if (this.initialized && this.client) return;

    try {
      const c = this.connectionConfig;
      const redisUrl =
        c.url ||
        process.env.REDIS_URL ||
        `redis://${c.host || process.env.REDIS_HOST || "localhost"}:${c.port ?? process.env.REDIS_PORT ?? 6379}`;

      const database = c.database ?? (process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined);

      this.client = createClient({
        url: redisUrl,
        username: c.username || process.env.REDIS_USERNAME || undefined,
        password: c.password || process.env.REDIS_PASSWORD || undefined,
        database,
      });

      this.client.on("error", (err) => {
        console.error("[RedisDriver] Connection error:", err);
      });

      await this.client.connect();
      this.initialized = true;
    } catch (error) {
      console.error("[RedisDriver] Failed to connect:", error);
      throw error;
    }
  }

  private async ensureConnected(): Promise<RedisClientType> {
    if (!this.client || !this.initialized) await this.init();
    return this.client!;
  }

  async size(queue: string = this.defaultQueue): Promise<number> {
    const client = await this.ensureConnected();
    const pending = await client.lLen(this.key(queue));
    const delayed = await client.zCard(this.key(queue, "delayed:score"));
    const reserved = await client.hLen(this.key(queue, "reserved"));
    return pending + delayed + reserved;
  }

  async push(job: SerializedJob, queue: string = this.defaultQueue): Promise<string> {
    const client = await this.ensureConnected();

    if (job.availableAt > Date.now()) {
      // Delayed: store payload in hash, add UUID to sorted set scored by availableAt
      await client.hSet(this.key(queue, "delayed:body"), job.uuid, JSON.stringify(job));
      await client.zAdd(this.key(queue, "delayed:score"), {
        score: job.availableAt,
        value: job.uuid,
      });
    } else {
      await client.rPush(this.key(queue), JSON.stringify(job));
    }

    return job.id;
  }

  async later(
    delay: number,
    job: SerializedJob,
    queue: string = this.defaultQueue,
  ): Promise<string> {
    job.availableAt = Date.now() + delay * 1000;
    return this.push(job, queue);
  }

  async pop(queue: string = this.defaultQueue): Promise<SerializedJob | null> {
    const client = await this.ensureConnected();

    await this.migrateDelayedJobs(queue);
    await this.migrateExpiredReserved(queue);

    const payload = await client.lPop(this.key(queue));
    if (!payload) return null;

    const job: SerializedJob = JSON.parse(payload);
    job.attempts += 1;
    job.reservedAt = Date.now();

    // Store reserved payload in hash keyed by UUID — no fragile ZSet serialization
    await client.hSet(this.key(queue, "reserved"), job.uuid, JSON.stringify(job));

    return job;
  }

  private async migrateDelayedJobs(queue: string): Promise<void> {
    const client = await this.ensureConnected();
    const now = Date.now();

    const uuids = await client.zRangeByScore(
      this.key(queue, "delayed:score"),
      "-inf",
      now.toString(),
    );

    for (const uuid of uuids) {
      const body = await client.hGet(this.key(queue, "delayed:body"), uuid);
      if (body) {
        await client.rPush(this.key(queue), body);
        await client.hDel(this.key(queue, "delayed:body"), uuid);
      }
      await client.zRem(this.key(queue, "delayed:score"), uuid);
    }
  }

  private async migrateExpiredReserved(queue: string): Promise<void> {
    const client = await this.ensureConnected();
    const now = Date.now();
    const cutoff = now - this.retryAfter * 1000;

    const entries = await client.hGetAll(this.key(queue, "reserved"));

    for (const [uuid, body] of Object.entries(entries)) {
      const job: SerializedJob = JSON.parse(body);
      if (job.reservedAt != null && job.reservedAt < cutoff) {
        // Put back in the main queue with attempts already incremented from pop()
        await client.rPush(this.key(queue), body);
        await client.hDel(this.key(queue, "reserved"), uuid);
      }
    }
  }

  async delete(job: SerializedJob, queue: string = this.defaultQueue): Promise<void> {
    const client = await this.ensureConnected();
    await client.hDel(this.key(queue, "reserved"), job.uuid);
  }

  async release(
    job: SerializedJob,
    delay: number,
    queue: string = this.defaultQueue,
  ): Promise<void> {
    const client = await this.ensureConnected();

    // Remove from reserved hash
    await client.hDel(this.key(queue, "reserved"), job.uuid);

    // Update job state
    job.reservedAt = null;
    job.availableAt = Date.now() + delay * 1000;

    const newPayload = JSON.stringify(job);

    if (delay > 0) {
      await client.hSet(this.key(queue, "delayed:body"), job.uuid, newPayload);
      await client.zAdd(this.key(queue, "delayed:score"), {
        score: job.availableAt,
        value: job.uuid,
      });
    } else {
      await client.rPush(this.key(queue), newPayload);
    }
  }

  async clear(queue: string = this.defaultQueue): Promise<number> {
    const client = await this.ensureConnected();
    const size = await this.size(queue);

    await client.del(this.key(queue));
    await client.del(this.key(queue, "delayed:score"));
    await client.del(this.key(queue, "delayed:body"));
    await client.del(this.key(queue, "reserved"));

    return size;
  }

  async getJobs(queue: string = this.defaultQueue): Promise<SerializedJob[]> {
    const client = await this.ensureConnected();

    const pending = await client.lRange(this.key(queue), 0, -1);
    const delayedBodies = Object.values(await client.hGetAll(this.key(queue, "delayed:body")));
    const reservedBodies = Object.values(await client.hGetAll(this.key(queue, "reserved")));

    return [...pending, ...delayedBodies, ...reservedBodies].map((p) => JSON.parse(p));
  }

  /*
  |--------------------------------------------------------------------------
  | Failed Jobs Management
  |--------------------------------------------------------------------------
  */

  /**
   * Failed jobs are stored under the prefix of the application that owns the
   * queue, so a failure on `emails@billing` lands in billing's failed hash and
   * billing's `queue:retry` can recover it.
   */
  private failedKey(queue?: string): string {
    const app = queue ? parseQueueName(queue).app : undefined;
    const prefix = app ? this.prefixForApp(app) : this.prefix;
    return `${prefix}:failed_jobs`;
  }

  async logFailed(
    connection: string,
    queue: string,
    job: SerializedJob,
    exception: Error,
  ): Promise<void> {
    const client = await this.ensureConnected();

    const failedJob = {
      uuid: job.uuid,
      connection,
      queue,
      payload: job,
      exception: exception.stack || exception.message,
      failed_at: new Date().toISOString(),
    };

    await client.hSet(this.failedKey(queue), job.uuid, JSON.stringify(failedJob));
  }

  async getFailedJobs(): Promise<any[]> {
    const client = await this.ensureConnected();
    const jobs = await client.hGetAll(this.failedKey());
    return Object.values(jobs).map((j) => JSON.parse(j));
  }

  async retryFailed(uuid: string): Promise<boolean> {
    const client = await this.ensureConnected();

    const data = await client.hGet(this.failedKey(), uuid);
    if (!data) return false;

    const failedJob = JSON.parse(data);
    const job: SerializedJob = failedJob.payload;

    job.attempts = 0;
    job.exceptionCount = 0;
    job.reservedAt = null;
    job.availableAt = Date.now();

    await this.push(job, failedJob.queue);
    await this.forgetFailed(uuid);

    return true;
  }

  async forgetFailed(uuid: string): Promise<boolean> {
    const client = await this.ensureConnected();
    const result = await client.hDel(this.failedKey(), uuid);
    return result > 0;
  }

  async flushFailed(): Promise<number> {
    const client = await this.ensureConnected();
    const count = await client.hLen(this.failedKey());
    await client.del(this.failedKey());
    return count;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.initialized = false;
    }
  }
}
