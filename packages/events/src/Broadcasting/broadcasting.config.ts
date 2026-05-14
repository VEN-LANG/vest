export interface BroadcastingConfig {
  default: string;
  connections: {
    websocket: { driver: "websocket"; path: string; pingInterval: number; pingTimeout: number };
    redis: { driver: "redis"; connection: string };
    log: { driver: "log" };
    null: { driver: "null" };
  };
  auth: { endpoint: string; headerName: string };
}

const broadcastingConfig: BroadcastingConfig = {
  default: process.env.BROADCAST_DRIVER ?? "websocket",
  connections: {
    websocket: {
      driver: "websocket",
      path: process.env.BROADCAST_WEBSOCKET_PATH ?? "/ws",
      pingInterval: parseInt(process.env.BROADCAST_PING_INTERVAL ?? "25000", 10),
      pingTimeout: parseInt(process.env.BROADCAST_PING_TIMEOUT ?? "20000", 10),
    },
    redis: { driver: "redis", connection: process.env.BROADCAST_REDIS_CONNECTION ?? "default" },
    log: { driver: "log" },
    null: { driver: "null" },
  },
  auth: {
    endpoint: process.env.BROADCAST_AUTH_ENDPOINT ?? "/broadcasting/auth",
    headerName: process.env.BROADCAST_AUTH_HEADER ?? "Authorization",
  },
};

export default broadcastingConfig;
