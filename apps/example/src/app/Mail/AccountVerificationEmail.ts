import { Mailable } from '@lara-node/mail';

/*
|--------------------------------------------------------------------------
| AccountVerificationEmail
|--------------------------------------------------------------------------
|
| Sending after registration:
|   await Mail.send(new AccountVerificationEmail('Jane', 'jane@example.com', verifyToken));
|
*/
export class AccountVerificationEmail extends Mailable {
  private verifyUrl: string;

  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
    private readonly token: string,
  ) {
    super();
    const base = process.env.APP_URL || 'http://localhost:3000';
    this.verifyUrl = `${base}/verify-email?token=${token}&email=${encodeURIComponent(userEmail)}`;
  }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', process.env.MAIL_FROM_NAME || 'apps/example')
      .subject('Please verify your email address')
      .html(`
        <h2>Verify Your Email</h2>
        <p>Hi ${this.userName},</p>
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <a href="${this.verifyUrl}" style="
          display:inline-block;padding:12px 24px;background:#059669;color:#fff;
          text-decoration:none;border-radius:6px;font-weight:bold;
        ">Verify Email</a>
        <p style="margin-top:16px;color:#666;font-size:13px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      `)
      .text(`Hi ${this.userName},\n\nVerify your email: ${this.verifyUrl}`);
  }
}
