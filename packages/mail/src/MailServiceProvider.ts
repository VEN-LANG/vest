import { ServiceProvider } from "@vest/core";

export class MailServiceProvider extends ServiceProvider {
  register(): void {
    // Mail is accessed via the Mail() facade function — no container binding needed
  }

  boot(): void {}
}
