import type { Model } from "../Model.js";

/** Merges the static/instance surface of all applied trait classes onto MClass. */
export type AttachTraits<MClass, Traits extends readonly any[]> = Traits extends readonly [
  infer Head,
  ...infer Tail,
]
  ? AttachTraits<MClass & (Head extends new (...args: any[]) => infer I ? I : Head), Tail>
  : MClass;
