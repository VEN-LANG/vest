import { Model } from "@vest/db";

/*
|--------------------------------------------------------------------------
| Queue Job Model
|--------------------------------------------------------------------------
|
| This model represents a job in the queue.
|
*/

export class QueueJob extends Model {
  static table = "jobs";
  static primaryKey = "id";
  static timestamps = false;

  static fillable = [
    "uuid",
    "queue",
    "payload",
    "attempts",
    "reserved_at",
    "available_at",
    "created_at",
  ];

  static casts = {
    attempts: "int",
    reserved_at: "int",
    available_at: "int",
    created_at: "int",
  } as any;

  /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

  /**
   * Scope to get jobs for a specific queue.
   */
  static scopeForQueue(query: any, queue: string) {
    return query.where("queue", queue);
  }

  /**
   * Scope to get available jobs (not reserved or reservation expired).
   */
  static scopeAvailable(query: any, now: number, retryAfter: number) {
    const expiredReservation = now - retryAfter;
    return query
      .where(function (q: any) {
        q.whereNull("reserved_at").orWhere("reserved_at", "<", expiredReservation);
      })
      .where("available_at", "<=", now);
  }

  /**
   * Scope to get the next available job.
   */
  static scopeNextAvailable(query: any, queue: string, now: number, retryAfter: number) {
    return query.forQueue(queue).available(now, retryAfter).orderBy("id", "asc");
  }

  /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

  /**
   * Get the parsed payload.
   */
  getParsedPayload(): any {
    try {
      return JSON.parse(this.payload);
    } catch {
      return null;
    }
  }

  /**
   * Mark the job as reserved.
   */
  async reserve(timestamp: number): Promise<void> {
    this.reserved_at = timestamp;
    this.attempts = (this.attempts || 0) + 1;
    await this.save();
  }

  /**
   * Release the job back to the queue.
   */
  async release(availableAt: number, payload?: string): Promise<void> {
    this.reserved_at = null;
    this.available_at = availableAt;
    if (payload) {
      this.payload = payload;
    }
    await this.save();
  }
}

export default QueueJob;
