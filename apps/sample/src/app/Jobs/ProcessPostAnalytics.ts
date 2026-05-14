import { Job } from "@vest/queue";

export class ProcessPostAnalytics extends Job {
  constructor(
    public readonly postId: string,
    public readonly action: "view" | "share" | "like",
  ) {
    super();
  }

  async handle(): Promise<void> {
    // In production: update analytics counters, ML pipelines, etc.
    console.log(`[Analytics] post=${this.postId} action=${this.action}`);
  }

  failed(error: Error): void {
    console.error(`[Analytics] Failed for post ${this.postId}:`, error.message);
  }
}
