import { Mail, mail } from "@vest/mail";
import { WelcomeEmail } from "@app/Mail";
import { ListensTo, ShouldQueue } from "@vest/events";
import { Listener } from "@vest/events";
import { UserLoggedIn, UserRegistered } from "@app/Events";

/*
|--------------------------------------------------------------------------
| Send Welcome Email Listener
|--------------------------------------------------------------------------
|
| This listener sends a welcome email when a user registers.
| Uses @ListensTo decorator for automatic registration.
|
*/

@ListensTo("user.registered")
export class SendWelcomeEmail extends Listener<UserRegistered> {
  async handle(payload: UserRegistered): Promise<void> {
    console.log(`[SendWelcomeEmail] Sending welcome email to ${payload.email}`);

    const mailable = new WelcomeEmail(payload.name, payload.email);

    // Queue the email to be sent in the background
    await Mail().queue(mailable, "emails");

    console.log(`[SendWelcomeEmail] Welcome email queued for ${payload.email}`);
  }
}

/*
|--------------------------------------------------------------------------
| Log User Login Listener
|--------------------------------------------------------------------------
*/

@ListensTo("user.logged_in")
export class LogUserLogin extends Listener<UserLoggedIn> {
  async handle(payload: UserLoggedIn): Promise<void> {
    console.log(
      `[LogUserLogin] User ${payload.userId} (${payload.email}) logged in` +
        (payload.ipAddress ? ` from ${payload.ipAddress}` : ""),
    );

    // In a real app, you might save this to a login_logs table
    // await LoginLog.create({
    //     user_id: payload.userId,
    //     ip_address: payload.ipAddress,
    //     logged_in_at: new Date(),
    // });
  }
}

/*
|--------------------------------------------------------------------------
| Notify Admin On Registration Listener
|--------------------------------------------------------------------------
|
| This listener is queued to run in the background.
|
*/

@ListensTo("user.registered")
@ShouldQueue({ queue: "notifications" })
export class NotifyAdminOnRegistration extends Listener<UserRegistered> {
  async handle(payload: UserRegistered): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.log("[NotifyAdminOnRegistration] No admin email configured, skipping");
      return;
    }

    console.log(`[NotifyAdminOnRegistration] Notifying admin of new user: ${payload.email}`);

    // Send a simple notification email to admin
    await mail(
      adminEmail,
      `New User Registration: ${payload.name}`,
      `A new user has registered:\n\nName: ${payload.name}\nEmail: ${payload.email}\nUser ID: ${payload.userId}`,
      { html: false },
    );
  }

  /**
   * Determine if this listener should handle the event.
   */
  shouldHandle(payload: UserRegistered): boolean {
    // Only notify admin for non-test emails
    return !payload.email.includes("@test.com");
  }
}
