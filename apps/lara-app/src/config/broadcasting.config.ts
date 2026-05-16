export const broadcastingConfig = {
  default: process.env.BROADCAST_DRIVER || 'log',
  connections: {
    pusher: {
      driver: 'pusher',
      key: process.env.PUSHER_APP_KEY || '',
      secret: process.env.PUSHER_APP_SECRET || '',
      appId: process.env.PUSHER_APP_ID || '',
    },
    log: { driver: 'log' },
    null: { driver: 'null' },
  },
};

export default broadcastingConfig;
