export interface QueueConfig {
  default: string;
  connections: Record<string, { driver: string; table?: string; queue?: string; retry_after?: number }>;
  failed: { driver: string; table: string };
}

const queueConfig: QueueConfig = {
  default: process.env.QUEUE_CONNECTION || 'sync',

  connections: {
    sync: { driver: 'sync' },
    database: { driver: 'database', table: 'jobs', queue: 'default', retry_after: 90 },
    redis: {
      driver: 'redis',
      queue: process.env.REDIS_QUEUE || 'default',
      retry_after: 90,
    },
  },

  failed: { driver: 'database', table: 'failed_jobs' },
};

export const QUEUE_CONNECTION = queueConfig.default;
export default queueConfig;
