import { Model } from "@vest-ts/db";

/*
|--------------------------------------------------------------------------
| Failed Job Model
|--------------------------------------------------------------------------
|
| This model represents a failed job in the queue.
|
*/

export class FailedJob extends Model {
  static table = "failed_jobs";
  static primaryKey = "id";
  static timestamps = false;

  static fillable = ["uuid", "connection", "queue", "payload", "exception", "failed_at"];

  static casts = {
    id: "int",
    failed_at: "datetime",
  } as any;

  /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

  /**
   * Scope to find by UUID.
   */
  static scopeByUuid(query: any, uuid: string) {
    return query.where("uuid", uuid);
  }

  /**
   * Scope to get jobs for a specific queue.
   */
  static scopeForQueue(query: any, queue: string) {
    return query.where("queue", queue);
  }

  /**
   * Scope to get jobs for a specific connection.
   */
  static scopeForConnection(query: any, connection: string) {
    return query.where("connection", connection);
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
   * Get a summary of the exception.
   */
  getExceptionSummary(maxLength: number = 100): string {
    if (!this.exception) return "";
    const firstLine = this.exception.split("\n")[0];
    return firstLine.length > maxLength ? firstLine.substring(0, maxLength) + "..." : firstLine;
  }
}

export default FailedJob;
