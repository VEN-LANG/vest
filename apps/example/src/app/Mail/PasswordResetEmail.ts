import { Mailable } from "@vest-ts/mail";

/*
|--------------------------------------------------------------------------
| Password Reset Email Mailable
|--------------------------------------------------------------------------
|
| This mailable is sent when a user requests a password reset.
|
*/

export class PasswordResetEmail extends Mailable {
  constructor(
    private userEmail: string,
    private resetToken: string,
    private expiresIn: number = 60, // minutes
  ) {
    super();
  }

  build(): this {
    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${this.resetToken}`;

    return this.to(this.userEmail)
      .subject("Reset Your Password")
      .html(this.getHtmlContent(resetUrl))
      .text(this.getTextContent(resetUrl))
      .priority("high")
      .tag(["password-reset", "security"]);
  }

  private getHtmlContent(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 4px; }
        .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>We received a request to reset your password.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in ${this.expiresIn} minutes.
            </div>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            <p style="font-size: 12px; color: #666;">
                Can't click the button? Copy and paste this link into your browser:<br>
                <code>${resetUrl}</code>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || "Our App"}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
  }

  private getTextContent(resetUrl: string): string {
    return `
Password Reset Request

We received a request to reset your password.

Click the link below to reset your password:
${resetUrl}

⚠️ Important: This link will expire in ${this.expiresIn} minutes.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} ${process.env.APP_NAME || "Our App"}. All rights reserved.
        `.trim();
  }
}
