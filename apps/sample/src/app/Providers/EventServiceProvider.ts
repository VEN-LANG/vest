import { ServiceProvider } from "@lara-node/core";
import { getEventDispatcher } from "@lara-node/events";
import { WelcomeNewAuthor } from "../Listeners/WelcomeNewAuthor.js";

export class EventServiceProvider extends ServiceProvider {
  register(): void {}

  boot(): void {
    const dispatcher = getEventDispatcher();

    // Register listeners manually (alternative to @ListensTo decorator auto-discovery)
    dispatcher.listen("post.created", async (event: any) => {
      const listener = new WelcomeNewAuthor();
      await listener.handle(event);
    });
  }
}
