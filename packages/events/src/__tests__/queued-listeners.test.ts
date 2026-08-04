import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@lara-node/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lara-node/core")>();
  return {
    ...actual,
    // Only the config accessors are stubbed; `container` has to be the real
    // one, because jobs and listeners are now built through it.
    config: <T>(_key: string, fallback: T) => fallback,
    setConfig: () => {},
  };
});

import { EventDispatcher, ShouldQueue, ListensTo } from "../index.js";
import { getRegisteredJobs } from "@lara-node/queue";

/*
|--------------------------------------------------------------------------
| Queued listeners survive the trip through the queue
|--------------------------------------------------------------------------
|
| A queued listener is not called directly — it is wrapped in a
| CallQueuedListener job, serialized, pushed, and then rebuilt from the job
| registry on the way out. The registry is module-global state inside
| @lara-node/queue, populated by the @Queueable decorator when
| QueuedEventJobs is evaluated.
|
| That gives two ways for the whole mechanism to fail silently, and both have
| happened:
|
|   1. The dispatcher pulled Queue in with `await import("@lara-node/queue")`.
|      From the CJS build that resolves the package's ESM condition, loading a
|      SECOND copy of @lara-node/queue whose registry is empty. Every queued
|      listener then died with `Job class "CallQueuedListener" not found in
|      registry` — logged, never thrown.
|
|   2. The sync driver treated a failed deserialization as "stop trying" and
|      returned the job id, so the caller was told the job had run.
|
| These tests pin both down: the job must be registered simply by loading the
| events package, and dispatching an event with a queued listener must
| actually run that listener.
|
*/

describe("queued listener dispatch", () => {
  it("registers CallQueuedListener merely by loading @lara-node/events", () => {
    // No dispatch has happened yet — importing the package is enough. If this
    // fails, the job classes are hiding behind a lazy import again.
    expect([...getRegisteredJobs().keys()]).toContain("CallQueuedListener");
    expect([...getRegisteredJobs().keys()]).toContain("CallQueuedEvent");
  });

  it("resolves the job through the same registry the decorator wrote to", () => {
    // The failure mode is two module instances, which shows up as the
    // decorator and the lookup disagreeing. One registry, one answer.
    const registered = getRegisteredJobs().get("CallQueuedListener");
    expect(registered).toBeTypeOf("function");
    expect(registered!.name).toBe("CallQueuedListener");
  });

  it("runs a queued listener end to end over the sync driver", async () => {
    const seen: unknown[] = [];

    @ShouldQueue()
    @ListensTo("order.shipped")
    class NotifyCustomer {
      async handle(payload: unknown): Promise<void> {
        seen.push(payload);
      }
    }

    const dispatcher = new EventDispatcher();
    dispatcher.listenQueued("order.shipped", {
      listener: (payload: unknown) => new NotifyCustomer().handle(payload),
      listenerClass: NotifyCustomer,
      shouldQueue: true,
    });

    // QUEUE_CONNECTION is unset under test, so the queue defaults to sync and
    // the round trip happens inline.
    await dispatcher.dispatch("order.shipped", { orderId: "ord_1" });

    // The listener ran because the job round-tripped: serialized on push,
    // rebuilt from the registry on pop.
    expect(seen).toEqual([{ orderId: "ord_1" }]);
  });
});

describe("SyncDriver on an unregistered job", () => {
  let SyncDriver: typeof import("@lara-node/queue").SyncDriver;

  beforeEach(async () => {
    ({ SyncDriver } = await import("@lara-node/queue"));
  });

  it("throws rather than reporting a job it silently discarded", async () => {
    const driver = new SyncDriver();

    await expect(
      driver.push({
        id: "1",
        uuid: "u1",
        displayName: "GhostJob",
        job: "GhostJob", // Never decorated with @Queueable.
        data: "{}",
        encrypted: false,
        queue: "default",
        attempts: 0,
        maxTries: 1,
        maxExceptions: 1,
        exceptionCount: 0,
        timeout: 30,
        backoff: 0,
        retryUntil: null,
        createdAt: Date.now(),
        availableAt: Date.now(),
        reservedAt: null,
      }),
    ).rejects.toThrow(/not in the job registry/);
  });
});
