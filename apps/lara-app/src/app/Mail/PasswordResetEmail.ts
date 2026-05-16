import { Mailable } from '@lara-node/mail';

export class PasswordResetEmail extends Mailable {
  private readonly resetUrl: string;

  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
    token: string,
  ) {
    super();
    const base = process.env.APP_URL || 'http://localhost:3000';
    this.resetUrl = `${base}/reset-password?token=${token}&email=${encodeURIComponent(userEmail)}`;
  }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', 'Lara App')
      .subject('Reset Your Password')
      .html(`<p>Hi ${this.userName},</p><p><a href="${this.resetUrl}">Reset password</a></p>`)
      .text(`Hi ${this.userName},\nReset your password: ${this.resetUrl}`);
  }
}
