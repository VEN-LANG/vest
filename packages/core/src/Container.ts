import "reflect-metadata";

export type Constructor<T = any> = new (...args: any[]) => T;
export type Abstract<T = any> = Constructor<T> | string | symbol;

type Binding<T = any> = {
  concrete: any;
  singleton: boolean;
};

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
      const dependencies = params.map((param) => this.make(param));
      return new concrete(...dependencies);
    }
    return concrete;
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
