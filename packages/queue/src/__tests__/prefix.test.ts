import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("@lara-node/core", () => ({
  config: <T>(_key: string, fallback: T) => fallback,
  setConfig: () => {},
}));

// Capture every Redis command so we can assert on the key layout.
const commands: Array<{ cmd: string; key: string }> = [];

const fakeClient = {
  on: () => fakeClient,
  connect: async () => {},
  quit: async () => {},
  lLen: async (key: string) => (commands.push({ cmd: "lLen", key }), 0),
  zCard: async (key: string) => (commands.push({ cmd: "zCard", key }), 0),
  hLen: async (key: string) => (commands.push({ cmd: "hLen", key }), 0),
  rPush: async (key: string) => (commands.push({ cmd: "rPush", key }), 1),
  hSet: async (key: string) => (commands.push({ cmd: "hSet", key }), 1),
  zAdd: async (key: string) => (commands.push({ cmd: "zAdd", key }), 1),
  lPop: async (key: string) => (commands.push({ cmd: "lPop", key }), null),
  zRangeByScore: async (key: string) => (commands.push({ cmd: "zRangeByScore", key }), []),
  hGetAll: async (key: string) => (commands.push({ cmd: "hGetAll", key }), {}),
  hGet: async (key: string) => (commands.push({ cmd: "hGet", key }), null),
  hDel: async (key: string) => (commands.push({ cmd: "hDel", key }), 1),
  del: async (key: string) => (commands.push({ cmd: "del", key }), 1),
  lRange: async (key: string) => (commands.push({ cmd: "lRange", key }), []),
};

vi.mock("redis", () => ({ createClient: () => fakeClient }));

const { appKey, appName, defaultPrefixFor, parseQueueName, qualifyQueue, resolvePrefix } =
  await import("../namespace.js");
const { RedisDriver } = await import("../Drivers/RedisDriver.js");

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: "1",
    uuid: "uuid-1",
    displayName: "TestJob",
    job: "TestJob",
    data: "{}",
    queue: "default",
    attempts: 0,
    maxTries: 3,
    maxExceptions: 1,
    exceptionCount: 0,
    timeout: 60,
    backoff: 1,
    retryUntil: null,
    encrypted: false,
    createdAt: Date.now(),
    availableAt: Date.now() - 1000,
    reservedAt: null,
    ...overrides,
  } as never;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  commands.length = 0;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("queue name parsing", () => {
  it("treats a bare name as belonging to this application", () => {
    expect(parseQueueName("emails")).toEqual({ queue: "emails" });
  });

  it("splits an app-qualified name", () => {
    expect(parseQueueName("emails@billing")).toEqual({ queue: "emails", app: "billing" });
  });

  it("splits on the last @ so queue names may contain one", () => {
    expect(parseQueueName("a@b@billing")).toEqual({ queue: "a@b", app: "billing" });
  });

  it("ignores a leading or trailing @", () => {
    expect(parseQueueName("@billing")).toEqual({ queue: "@billing" });
    expect(parseQueueName("emails@")).toEqual({ queue: "emails@" });
  });

  it("round-trips through qualifyQueue", () => {
    expect(qualifyQueue("emails", "billing")).toBe("emails@billing");
    expect(qualifyQueue("emails")).toBe("emails");
    expect(parseQueueName(qualifyQueue("emails", "billing"))).toEqual({
      queue: "emails",
      app: "billing",
    });
  });
});

describe("prefix resolution", () => {
  it("prefers QUEUE_APP over APP_NAME", () => {
    process.env.APP_NAME = "from-app-name";
    process.env.QUEUE_APP = "from-queue-app";
    expect(appName()).toBe("from-queue-app");
  });

  it("falls back to 'app' when neither is set", () => {
    delete process.env.APP_NAME;
    delete process.env.QUEUE_APP;
    expect(appName()).toBe("app");
  });

  it("derives the prefix from the app name", () => {
    expect(defaultPrefixFor("billing")).toBe("billing_queue");
    expect(resolvePrefix({ app: "billing" })).toBe("billing_queue");
  });

  it("lets an explicit prefix win over the derived one", () => {
    expect(resolvePrefix({ app: "billing", prefix: "custom-jobs" })).toBe("custom-jobs");
  });

  it("scopes non-queue signal keys to the application", () => {
    process.env.QUEUE_APP = "billing";
    expect(appKey("queue", "restart")).toBe("billing:queue:restart");
    expect(appKey("maintenance")).toBe("billing:maintenance");
  });
});

describe("RedisDriver key namespacing", () => {
  it("writes every key under the connection prefix", async () => {
    const driver = new RedisDriver({ app: "billing", queue: "default" });
    expect(driver.getPrefix()).toBe("billing_queue");

    await driver.push(job(), "emails");
    expect(commands).toEqual([{ cmd: "rPush", key: "billing_queue:emails" }]);
  });

  it("keeps two applications on separate keys", async () => {
    const billing = new RedisDriver({ app: "billing" });
    const search = new RedisDriver({ app: "search" });

    await billing.push(job(), "index");
    await search.push(job(), "index");

    expect(commands.map((c) => c.key)).toEqual(["billing_queue:index", "search_queue:index"]);
  });

  it("routes a queue@app name to the other application's prefix", async () => {
    const driver = new RedisDriver({ app: "billing" });
    await driver.push(job(), "index@search");
    expect(commands).toEqual([{ cmd: "rPush", key: "search_queue:index" }]);
  });

  it("honours a sibling's non-default prefix from the apps map", async () => {
    const driver = new RedisDriver({ app: "billing", apps: { search: "search-jobs" } });
    await driver.push(job(), "index@search");
    expect(commands).toEqual([{ cmd: "rPush", key: "search-jobs:index" }]);
  });

  it("namespaces delayed job keys", async () => {
    const driver = new RedisDriver({ app: "billing" });
    await driver.push(job({ availableAt: Date.now() + 60_000 }), "emails");

    expect(commands.map((c) => c.key)).toEqual([
      "billing_queue:emails:delayed:body",
      "billing_queue:emails:delayed:score",
    ]);
  });

  it("stores failed jobs under the owning application's prefix", async () => {
    const driver = new RedisDriver({ app: "billing" });

    await driver.logFailed("redis", "emails", job(), new Error("boom"));
    expect(commands.at(-1)).toEqual({ cmd: "hSet", key: "billing_queue:failed_jobs" });

    commands.length = 0;
    await driver.logFailed("redis", "index@search", job(), new Error("boom"));
    expect(commands.at(-1)).toEqual({ cmd: "hSet", key: "search_queue:failed_jobs" });
  });

  it("clears only its own application's keys", async () => {
    const driver = new RedisDriver({ app: "billing" });
    await driver.clear("emails");

    const deleted = commands.filter((c) => c.cmd === "del").map((c) => c.key);
    expect(deleted).toEqual([
      "billing_queue:emails",
      "billing_queue:emails:delayed:score",
      "billing_queue:emails:delayed:body",
      "billing_queue:emails:reserved",
    ]);
  });
});
