import { Mailable } from '@lara-node/mail';

/*
|--------------------------------------------------------------------------
| WelcomeEmail
|--------------------------------------------------------------------------
|
| Sending:
|   import { Mail } from '@lara-node/mail';
|   await Mail.send(new WelcomeEmail('Jane', 'jane@example.com'));
|
| Via queue:
|   await Mail.queue(new WelcomeEmail('Jane', 'jane@example.com'));
|
*/
export class WelcomeEmail extends Mailable {
  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
  ) { super(); }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || 'apps/example')
      .subject(`Welcome to apps/example, ${this.userName}!`)
      .html(`
        <h1>Welcome, ${this.userName}!</h1>
        <p>We're excited to have you on board.</p>
        <p>Get started by exploring the app:</p>
        <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="
          display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
          text-decoration:none;border-radius:6px;font-weight:bold;
        ">Open App</a>
        <p style="margin-top:32px;color:#666;font-size:13px;">
          Best regards,<br>apps/example Team
        </p>
      `)
      .text(`Hi ${this.userName},\n\nWelcome to apps/example!\n\nBest regards,\nThe apps/example Team`);
  }
}
