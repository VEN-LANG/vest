import { Event } from "@lara-node/events";

export class PostCreated extends Event {
  constructor(
    public readonly post: Record<string, any>,
    public readonly author: Record<string, any>,
  ) {
    super();
  }
}
