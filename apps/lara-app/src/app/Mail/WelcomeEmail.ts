import { Mailable } from '@lara-node/mail';

export class WelcomeEmail extends Mailable {
  constructor(
    private readonly userName: string,
    private readonly userEmail: string,
  ) { super(); }

  build() {
    return this
      .to(this.userEmail)
      .from(process.env.MAIL_FROM_ADDRESS || 'noreply@example.com', 'Lara App')
      .subject(`Welcome, ${this.userName}!`)
      .html(`<h1>Welcome, ${this.userName}!</h1><p>Thanks for joining us.</p>`)
      .text(`Welcome, ${this.userName}! Thanks for joining us.`);
  }
}
