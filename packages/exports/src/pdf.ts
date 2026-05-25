import puppeteer, { Browser, type PDFOptions as PuppeteerPDFOptions } from "puppeteer";
import { readFile } from "node:fs/promises";
import type { PDFOptions } from "./types.js";

let browser: Browser | null = null;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({ headless: true });
  }
  return browser;
}

export const toPDF = async (html: string, options?: PDFOptions): Promise<Buffer> => {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setContent(html, { waitUntil: "load" });
  const pdf = await page.pdf({ format: "A4", ...options } as PuppeteerPDFOptions);
  await page.close();
  await closeBrowser();
  return Buffer.from(pdf);
};
/*
 * Delimiters to replace with key escaped
 * example: ["{{" , "}}"] OR ["<%", "%>"]
 */
export const toPDFFromTemplate = async (
  templatePath: string,
  data?: Record<string, any>,
  options?: PDFOptions,
): Promise<Buffer> => {
  const [open, close] = options?.delimiters ?? ["{{", "}}"];
  let html = await readFile(templatePath, "utf-8");

  if (data) {
    const regex = new RegExp(`${escapeRegex(open)}(\\w+)${escapeRegex(close)}`, "g");
    html = html.replace(regex, (_, key: string) => String(data[key] ?? ""));
  }

  return toPDF(html, options);
};

export const closeBrowser = async (): Promise<void> => {
  if (browser) {
    await browser.close();
    browser = null;
  }
};
