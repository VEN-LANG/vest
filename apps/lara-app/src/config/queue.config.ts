export const queueConfig = {
  default: process.env.QUEUE_CONNECTION || 'sync',
  connections: {
    sync: { driver: 'sync' },
    redis: {
      driver: 'redis',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '',
      database: Number(process.env.REDIS_QUEUE_DB) || 0,
    },
  },
};

export default queueConfig;
