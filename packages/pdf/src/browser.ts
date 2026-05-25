import puppeteer, { type Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

/**
 * Returns the shared Puppeteer browser singleton, launching it if needed.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({ headless: true });
  }
  return browserInstance;
}

/**
 * Closes the shared browser singleton and resets the reference.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
