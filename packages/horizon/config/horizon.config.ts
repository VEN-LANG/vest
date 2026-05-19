export interface HorizonSupervisor {
  name: string;
  connection?: string;
  queue: string | string[];
  balance?: "simple" | "auto" | "false";
  processes?: number;
  tries: number;
  memory: number;
  timeout: number;
  sleep?: number;
  maxJobs?: number;
  maxTime?: number;
}

export interface EnvironmentConfig {
  supervisor: HorizonSupervisor[];
}

export interface HorizonConfig {
  enabled: boolean;
  path: string;
  token?: string;
  environments: Record<string, EnvironmentConfig>;
}

const horizonConfig: HorizonConfig = {
  enabled: process.env.HORIZON_ENABLED !== "false",
  path: process.env.HORIZON_PATH ?? "/horizon",
  token: process.env.HORIZON_TOKEN,
  environments: {
    production: {
      supervisor: [
        {
          name: "production-supervisor",
          connection: process.env.QUEUE_CONNECTION ?? "redis",
          queue: (process.env.HORIZON_QUEUES ?? "default,high,low").split(","),
          balance: "auto",
          processes: parseInt(process.env.HORIZON_PROCESSES ?? "10", 10),
          tries: 3,
          memory: 512,
          timeout: 60,
        },
      ],
    },
    local: {
      supervisor: [
        {
          name: "local-supervisor",
          connection: process.env.QUEUE_CONNECTION ?? "redis",
          queue: (process.env.HORIZON_QUEUES ?? "default").split(","),
          balance: "simple",
          processes: parseInt(process.env.HORIZON_PROCESSES ?? "3", 10),
          tries: 3,
          memory: 512,
          timeout: 60,
        },
      ],
    },
    development: {
      supervisor: [
        {
          name: "development-supervisor",
          connection: process.env.QUEUE_CONNECTION ?? "sync",
          queue: (process.env.HORIZON_QUEUES ?? "default").split(","),
          balance: "simple",
          processes: parseInt(process.env.HORIZON_PROCESSES ?? "1", 10),
          tries: 3,
          memory: 512,
          timeout: 60,
        },
      ],
    },
  },
};

export default horizonConfig;
