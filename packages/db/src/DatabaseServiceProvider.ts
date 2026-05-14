import { ServiceProvider } from "@vest/core";
import { initDatabase, query, getDbType } from "./connection.js";

export class DatabaseServiceProvider extends ServiceProvider {
  register(): void {
    this.container.singleton("db", () => ({ query, getDbType }));
    this.container.alias("db", "database");
  }

  async boot(): Promise<void> {
    const skip = (process.env.SKIP_DB ?? "").toLowerCase();
    if (skip === "1" || skip === "true") {
      console.warn("[DB] SKIP_DB set — skipping database initialization");
      return;
    }
    try {
      await initDatabase();
      console.log(`[DB] Connected (driver=${getDbType()})`);
    } catch (err: any) {
      console.error("[DB] Initialization failed:", err.message);
      throw err;
    }
  }
}
