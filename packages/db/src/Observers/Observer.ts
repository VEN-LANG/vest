export abstract class Observer<T extends object> {
  creating?(model: T): void | Promise<void>;
  created?(model: T): void | Promise<void>;

  updating?(model: T): void | Promise<void>;
  updated?(model: T): void | Promise<void>;

  saving?(model: T): void | Promise<void>;
  saved?(model: T): void | Promise<void>;

  deleting?(model: T): void | Promise<void>;
  deleted?(model: T): void | Promise<void>;

  restoring?(model: T): void | Promise<void>;
  restored?(model: T): void | Promise<void>;

  retrieved?(model: T): void | Promise<void>;
}
