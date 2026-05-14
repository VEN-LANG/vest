import { BroadcastServiceProvider as BaseProvider, Broadcast } from "@vest/events";
import jwt from "jsonwebtoken";
import User from "../Models/User/User.js";

/**
 * BroadcastServiceProvider
 *
 * Define channel authorization logic here. The framework (BroadcastManager setup,
 * WebSocket initialization) is handled in @vest/events BroadcastServiceProvider.
 */
export class BroadcastServiceProvider extends BaseProvider {
  async boot(): Promise<void> {
    await super.boot();

    // Authenticate WebSocket connections using JWT
    const manager = Broadcast.manager();
    const driver = await manager.driver();

    driver.setAuthenticator(async (token: string) => {
      const secret = process.env.JWT_SECRET ?? "dev-secret-change-me";
      try {
        const decoded = jwt.verify(token, secret) as any;
        const user = await User.with(["profile", "roles", "roles.permissions"]).find(decoded.sub);
        if (!user) return null;
        await user.update({ last_seen_at: new Date() });
        await user.refresh();
        return user.toJSON();
      } catch {
        return null;
      }
    });
  }

  protected override channels(): void {
    Broadcast.private("notifications.{userId}", (user, userId) => user?.id === parseInt(userId));
    Broadcast.private("user.{userId}", (user, userId) => user?.id === parseInt(userId));
    Broadcast.private("admin", (user) => user?.role === "admin");
    Broadcast.public("announcements");
    Broadcast.presence("online", (user) => {
      if (!user) return false;
      return { id: user.id, name: user.name };
    });
  }
}
