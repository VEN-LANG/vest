import { Mailable } from '@lara-node/mail';

/*
|--------------------------------------------------------------------------
| PasswordResetEmail
|--------------------------------------------------------------------------
|
| Sending:
|   await Mail.send(new PasswordResetEmail('Jane', 'jane@example.com', token));
|
*/
export class PasswordResetEmail extends Mailable {
  private resetUrl: string;

  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
    private readonly token: string,
  ) {
    super();
    const base = process.env.APP_URL || 'http://localhost:3000';
    this.resetUrl = `${base}/reset-password?token=${token}&email=${encodeURIComponent(userEmail)}`;
  }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || 'apps/example')
      .subject('Reset your password')
      .html(`
        <h2>Password Reset Request</h2>
        <p>Hi ${this.userName},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="${this.resetUrl}" style="
          display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;
          text-decoration:none;border-radius:6px;font-weight:bold;
        ">Reset Password</a>
        <p style="margin-top:16px;color:#666;font-size:13px;">
          This link will expire in 60 minutes.<br>
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      `)
      .text(`Hi ${this.userName},\n\nReset your password: ${this.resetUrl}\n\nThis link expires in 60 minutes.`);
  }
}
