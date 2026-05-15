import { Event } from "@vest-ts/events";

export class PostCreated extends Event {
  constructor(
    public readonly post: Record<string, any>,
    public readonly author: Record<string, any>,
  ) {
    super();
  }
}
