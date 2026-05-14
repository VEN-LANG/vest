/*
|--------------------------------------------------------------------------
| Broadcasting Configuration
|--------------------------------------------------------------------------
|
| This file defines the configuration for the broadcasting system.
| Supports multiple drivers: websocket (default), redis, log.
|
*/

export interface BroadcastingConfig {
  /**
   * Default broadcaster driver.
   */
  default: string;

  /**
   * Broadcaster connections configuration.
   */
  connections: {
    websocket: {
      driver: "websocket";
      /**
       * Path for WebSocket connections.
       */
      path: string;
      /**
       * Ping interval in milliseconds.
       */
      pingInterval: number;
      /**
       * Ping timeout in milliseconds.
       */
      pingTimeout: number;
    };
    redis: {
      driver: "redis";
      connection: string;
    };
    log: {
      driver: "log";
    };
    null: {
      driver: "null";
    };
  };

  /**
   * Channel authentication settings.
   */
  auth: {
    /**
     * Endpoint for channel authentication.
     */
    endpoint: string;
    /**
     * Header name for authentication token.
     */
    headerName: string;
  };
}

export const broadcastingConfig: BroadcastingConfig = {
  default: process.env.BROADCAST_DRIVER || "websocket",

  connections: {
    websocket: {
      driver: "websocket",
      path: process.env.BROADCAST_WEBSOCKET_PATH || "/ws",
      pingInterval: parseInt(process.env.BROADCAST_PING_INTERVAL || "25000", 10),
      pingTimeout: parseInt(process.env.BROADCAST_PING_TIMEOUT || "20000", 10),
    },
    redis: {
      driver: "redis",
      connection: process.env.BROADCAST_REDIS_CONNECTION || "default",
    },
    log: {
      driver: "log",
    },
    null: {
      driver: "null",
    },
  },

  auth: {
    endpoint: process.env.BROADCAST_AUTH_ENDPOINT || "/broadcasting/auth",
    headerName: process.env.BROADCAST_AUTH_HEADER || "Authorization",
  },
};

export default broadcastingConfig;
