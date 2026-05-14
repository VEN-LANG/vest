import { Mailable } from "@vest/mail";

/*
|--------------------------------------------------------------------------
| Welcome Email Mailable
|--------------------------------------------------------------------------
|
| This mailable is sent when a new user registers.
|
*/

export class WelcomeEmail extends Mailable {
  constructor(
    private userName: string,
    private userEmail: string,
    private loginUrl: string = process.env.APP_URL || "http://localhost:3000",
  ) {
    super();
  }

  build(): this {
    return this.to(this.userEmail)
      .subject(`Welcome to ${process.env.APP_NAME || "Our App"}, ${this.userName}!`)
      .html(this.getHtmlContent())
      .text(this.getTextContent())
      .tag(["welcome", "onboarding"]);
  }

  private getHtmlContent(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome, ${this.userName}!</h1>
        </div>
        <div class="content">
            <p>Thank you for joining us! We're excited to have you on board.</p>
            <p>You can now access all features of our platform using your account.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${this.loginUrl}" class="button">Get Started</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || "Our App"}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
  }

  private getTextContent(): string {
    return `
Welcome, ${this.userName}!

Thank you for joining us! We're excited to have you on board.

You can now access all features of our platform using your account.

Get started here: ${this.loginUrl}

If you have any questions, feel free to reach out to our support team.

© ${new Date().getFullYear()} ${process.env.APP_NAME || "Our App"}. All rights reserved.
        `.trim();
  }
}
