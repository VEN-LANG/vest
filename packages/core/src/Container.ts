import "reflect-metadata";

export type Constructor<T = any> = new (...args: any[]) => T;
export type Abstract<T = any> = Constructor<T> | string | symbol;

type Binding<T = any> = {
  concrete: any;
  singleton: boolean;
};

/**
 * Constructor types that are never dependencies, only data.
 *
 * `Object` is the important one: TypeScript emits it for an interface, a
 * union, or `any`, so it means "the metadata cannot tell you" rather than
 * "an instance of Object".
 */
/**
 * Marks the dependencies the container injected into an instance.
 *
 * Non-enumerable, so it never shows up in a spread, `Object.keys`, or
 * `JSON.stringify`. Anything that serializes an object — a queued job, most
 * obviously — can consult it to tell "state this object carries" apart from
 * "collaborators it was handed", and leave the collaborators out. Putting a
 * service in a job payload is both wasteful and lossy: it comes back as a
 * plain object with none of its methods, silently replacing the real one.
 */
export const INJECTED_DEPENDENCIES = Symbol.for("lara-node.injected");

const UNRESOLVABLE: ReadonlySet<unknown> = new Set([
  String,
  Number,
  Boolean,
  Symbol,
  BigInt,
  Object,
  Array,
  Function,
  Date,
  RegExp,
  Promise,
]);

export class Container {
  private static instance: Container;

  private bindings = new Map<Abstract, Binding>();
  private instances = new Map<Abstract, any>();
  private aliases = new Map<Abstract, Abstract>();
  private resolvingCallbacks: Function[] = [];

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  public bind<T>(abstract: Abstract<T>, concrete: any = abstract, singleton = false): void {
    this.bindings.set(abstract, { concrete, singleton });
  }

  public bindIf<T>(abstract: Abstract<T>, concrete: any = abstract): void {
    if (!this.bound(abstract)) this.bind(abstract, concrete);
  }

  public singleton<T>(abstract: Abstract<T>, concrete: any = abstract): void {
    this.bind(abstract, concrete, true);
  }

  public singletonIf<T>(abstract: Abstract<T>, concrete: any = abstract): void {
    if (!this.bound(abstract)) this.singleton(abstract, concrete);
  }

  public instance<T>(abstract: Abstract<T>, instance: T): void {
    this.instances.set(abstract, instance);
  }

  public alias(abstract: Abstract, alias: Abstract): void {
    this.aliases.set(alias, abstract);
  }

  public bound(abstract: Abstract): boolean {
    return this.bindings.has(abstract) || this.instances.has(abstract);
  }

  public make<T>(abstract: Abstract<T>): T {
    abstract = this.getAlias(abstract);

    if (this.instances.has(abstract)) {
      return this.instances.get(abstract);
    }

    const binding = this.bindings.get(abstract);
    const concrete = binding?.concrete ?? abstract;
    const object = this.build<T>(concrete);

    if (binding?.singleton) {
      this.instances.set(abstract, object);
    }

    this.fireResolving(object);
    return object;
  }

  private build<T>(concrete: any): T {
    if (typeof concrete === "function") {
      const params: any[] = Reflect.getMetadata("design:paramtypes", concrete) ?? [];
      const dependencies = params.map((param) =>
        Container.isResolvable(param) ? this.make(param) : undefined,
      );

      const object = new concrete(...dependencies);

      const injected = dependencies.filter((dependency) => dependency !== undefined);
      if (injected.length > 0 && object !== null && typeof object === "object") {
        Object.defineProperty(object, INJECTED_DEPENDENCIES, {
          value: new Set(injected),
          enumerable: false,
          configurable: true,
        });
      }

      return object;
    }
    return concrete;
  }

  /**
   * Whether a constructor parameter is something the container can build.
   *
   * `design:paramtypes` reports a class for a class, and one of the built-in
   * wrappers for everything else — `Number` for `n: number`, `Object` for an
   * interface, a union, or `any`. Trying to build those produced nonsense: a
   * `batchSize: number` came back as `new Number()`, an object wrapper that
   * compares false against every integer.
   *
   * Passing `undefined` instead is both honest and useful, because it lets a
   * default parameter apply. That is what makes constructors that mix
   * services with plain data work:
   *
   *   constructor(private readonly outbox: Outbox, batchSize = 100) {}
   *
   * The service is injected; `batchSize` falls back to its default.
   */
  private static isResolvable(param: unknown): boolean {
    if (typeof param !== "function") return false;
    return !UNRESOLVABLE.has(param);
  }

  public resolving(callback: Function): void {
    this.resolvingCallbacks.push(callback);
  }

  private fireResolving(object: any): void {
    for (const cb of this.resolvingCallbacks) cb(object, this);
  }

  private getAlias(abstract: Abstract): Abstract {
    return this.aliases.get(abstract) ?? abstract;
  }
}

export const container = Container.getInstance();

export function app<T>(abstract?: Abstract<T>): T | Container {
  if (!abstract) return container;
  return container.make<T>(abstract);
}

export function Injectable(): ClassDecorator {
  return (target: any) => target;
}
