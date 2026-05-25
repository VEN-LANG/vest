import type { MinifyOptions } from './types.js';

/**
 * Pure TypeScript HTML minifier.
 * Strips HTML comments, collapses whitespace, and optionally removes empty attributes.
 * No external dependencies.
 */
export function minifyHtml(html: string, options: MinifyOptions = {}): string {
  const removeComments = options.removeComments !== false;
  const collapseWhitespace = options.collapseWhitespace !== false;
  const removeEmptyAttributes = options.removeEmptyAttributes === true;

  let result = html;

  if (removeComments) {
    // Remove HTML comments <!-- ... --> but preserve IE conditional comments
    result = result.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
  }

  if (collapseWhitespace) {
    // Collapse sequences of whitespace (space, tab, newline) to a single space
    // but preserve whitespace inside <pre>, <script>, <style>, <textarea> blocks
    const preserved: string[] = [];
    result = result.replace(
      /<(pre|script|style|textarea)[^>]*>[\s\S]*?<\/\1>/gi,
      (match) => {
        const idx = preserved.push(match) - 1;
        return `\x00PRESERVED_${idx}\x00`;
      },
    );

    result = result.replace(/\s+/g, ' ');
    result = result.replace(/>\s+</g, '><');
    result = result.trim();

    // Restore preserved blocks
    result = result.replace(/\x00PRESERVED_(\d+)\x00/g, (_, i: string) =>
      preserved[Number(i)],
    );
  }

  if (removeEmptyAttributes) {
    // Remove attributes like id="" class="" style=""
    result = result.replace(/\s+\w+=""\s*/g, ' ');
    result = result.replace(/\s+\w+=''\s*/g, ' ');
  }

  return result;
}
