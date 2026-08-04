import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { Container, INJECTED_DEPENDENCIES } from "../Container.js";

/*
|--------------------------------------------------------------------------
| Constructor injection
|--------------------------------------------------------------------------
|
| `design:paramtypes` reports a constructor for every parameter, including
| the ones that are plainly data: `Number` for `n: number`, and `Object` for
| an interface, a union, or `any` — where it really means "cannot say".
|
| Building those produced nonsense. A `batchSize: number` came back as
| `new Number()`, an object wrapper that is not `===` any integer and is
| truthy even at zero. Nothing threw; the job simply behaved oddly.
|
| So the container builds what it can and passes `undefined` for the rest,
| which is what lets a default parameter apply — and that is the whole trick
| behind constructors that mix services with data.
|
*/

class Mailer {
  readonly id = "mailer";
}

class Repository {
  constructor(readonly mailer: Mailer) {}
}

class ReportJob {
  constructor(
    readonly repository: Repository,
    readonly batchSize: number = 100,
    readonly label = "nightly",
  ) {}
}

// Emitted metadata, as TypeScript would with emitDecoratorMetadata.
Reflect.defineMetadata("design:paramtypes", [Mailer], Repository);
Reflect.defineMetadata("design:paramtypes", [Repository, Number, String], ReportJob);

describe("Container — constructor injection", () => {
  it("builds a dependency graph", () => {
    const job = new Container().make(ReportJob);

    expect(job.repository).toBeInstanceOf(Repository);
    expect(job.repository.mailer).toBeInstanceOf(Mailer);
  });

  it("leaves data parameters to their defaults", () => {
    const job = new Container().make(ReportJob);

    // The bug: these used to be `new Number()` and `new String()`.
    expect(job.batchSize).toBe(100);
    expect(job.label).toBe("nightly");
    expect(typeof job.batchSize).toBe("number");
  });

  it("honours an explicit binding over construction", () => {
    const container = new Container();
    const stub = new Mailer();
    container.instance(Mailer, stub);

    expect(container.make(Repository).mailer).toBe(stub);
  });

  it("returns one instance for a singleton and fresh ones otherwise", () => {
    const container = new Container();
    container.singleton(Mailer);

    expect(container.make(Mailer)).toBe(container.make(Mailer));
    expect(container.make(Repository)).not.toBe(container.make(Repository));
  });

  it("passes undefined for an untyped or interface parameter", () => {
    class Handler {
      constructor(readonly options: Record<string, unknown> = { fallback: true }) {}
    }
    // What TypeScript emits for an interface, a union, or `any`.
    Reflect.defineMetadata("design:paramtypes", [Object], Handler);

    expect(new Container().make(Handler).options).toEqual({ fallback: true });
  });

  it("builds a class with no metadata at all", () => {
    class Plain {
      readonly ok = true;
    }

    expect(new Container().make(Plain).ok).toBe(true);
  });
});

describe("Container — marking injected dependencies", () => {
  it("records what it injected, invisibly", () => {
    const job = new Container().make(ReportJob) as ReportJob & Record<symbol, Set<unknown>>;
    const marked = job[INJECTED_DEPENDENCIES];

    expect(marked.has(job.repository)).toBe(true);

    // Invisible to anything that walks the object — which is the point:
    // a queued job must not serialize its collaborators.
    expect(Object.keys(job)).not.toContain("INJECTED_DEPENDENCIES");
    expect(JSON.parse(JSON.stringify(job))).not.toHaveProperty("__injected");
  });

  it("leaves an instance with nothing injected unmarked", () => {
    const mailer = new Container().make(Mailer) as Mailer & Record<symbol, unknown>;

    expect(mailer[INJECTED_DEPENDENCIES]).toBeUndefined();
  });
});
