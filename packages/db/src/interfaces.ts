// Add cache for accessors/mutators
import { Model } from "./Model.js";

export interface AccessorDescriptor {
  name: string;
  sync?: (value: any, instance: Model) => any;
  async?: (value: any, instance: Model) => Promise<any>;
}

export interface MutatorDescriptor {
  name: string;
  sync?: (value: any, instance: Model) => any;
  async?: (value: any, instance: Model) => Promise<any>;
}

// Add interface for model events
export interface ModelEvents {
  creating: ((model: Model) => void | Promise<void>)[];
  created: ((model: Model) => void | Promise<void>)[];
  updating: ((model: Model) => void | Promise<void>)[];
  updated: ((model: Model) => void | Promise<void>)[];
  saving: ((model: Model) => void | Promise<void>)[];
  saved: ((model: Model) => void | Promise<void>)[];
  deleting: ((model: Model) => void | Promise<void>)[];
  deleted: ((model: Model) => void | Promise<void>)[];
  restoring: ((model: Model) => void | Promise<void>)[];
  restored: ((model: Model) => void | Promise<void>)[];
  retrieved: ((model: Model) => void | Promise<void>)[];
}
// Add this interface for type safety
export interface ToJSONOptions {
  maxDepth?: number;
  currentDepth?: number;
  visited?: WeakSet<any>;
  include?: string[];
  exclude?: string[];
  withRelations?: boolean;
  includeMetadata?: boolean;
  relationTree?: any;
  withAccessors?: boolean; // New option to include accessors
  onlyAppended?: boolean; // New option to only include appended attributes
}
