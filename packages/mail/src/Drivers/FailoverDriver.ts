import { MailDriverInterface, MailMessage, SendMailResult } from "../types.js";

import mailConfig, { MailerConfig } from "../mail.config.js";

/*
|--------------------------------------------------------------------------
| Failover Mail Driver
|--------------------------------------------------------------------------
|
| Attempts to send email using multiple drivers sequentially.
| If one fails, it tries the next one.
|
*/

export class FailoverDriver implements MailDriverInterface {
  private drivers: MailDriverInterface[] = [];
  private config: MailerConfig;

  constructor(config?: MailerConfig, driverFactory?: (name: string) => MailDriverInterface | null) {
    this.config = config || mailConfig.mailers.failover;

    if (driverFactory && this.config?.mailers?.length) {
      for (const mailerName of this.config.mailers) {
        const driver = driverFactory(mailerName);
        if (driver) {
          this.drivers.push(driver);
        }
      }
    }
  }

  /**
   * Return driver name
   */
  getName(): string {
    return "failover";
  }

  /**
   * Manually set drivers
   */
  setDrivers(drivers: MailDriverInterface[]): this {
    this.drivers = drivers;
    return this;
  }

  /**
   * Send email using failover strategy
   */
  async send(message: MailMessage): Promise<SendMailResult> {
    if (!this.drivers.length) {
      throw new Error("No drivers configured for failover");
    }

    let lastError: Error | null = null;

    for (const driver of this.drivers) {
      try {
        console.log(`[Failover] Attempting via ${driver.getName()}...`);

        const result = await driver.send(message);

        console.log(`[Failover] Successfully sent via ${driver.getName()}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[Failover] Failed via ${driver.getName()}: ${lastError.message}`);
      }
    }

    throw new Error(`All mail drivers failed. Last error: ${lastError?.message}`);
  }
}
