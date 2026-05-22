export const APP_NAME = process.env.APP_NAME || 'apps/example';
export const APP_ENV = process.env.APP_ENV || 'local';
export const APP_KEY = process.env.APP_KEY || '';
export const APP_DEBUG = process.env.APP_DEBUG === 'true';
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export const CACHE_DRIVER = (process.env.CACHE_DRIVER || 'file').toLowerCase();
export const CACHE_PREFIX = process.env.CACHE_PREFIX || APP_NAME;

export const DOCS_ENABLED = (() => {
  const flag = process.env.DOCS_ENABLED;
  if (flag !== undefined) return flag.toLowerCase() === 'true' || flag === '1';
  return process.env.NODE_ENV !== 'production';
})();
export const DOCS_TITLE = process.env.DOCS_TITLE || 'apps/example API';
export const DOCS_VERSION = process.env.DOCS_VERSION || '1.0.0';
export const DOCS_PATH = process.env.DOCS_PATH || '/docs';
export const DOCS_THEME = process.env.DOCS_THEME || 'kepler';

export default {
  name: APP_NAME,
  env: APP_ENV,
  debug: APP_DEBUG,
  url: APP_URL,
  key: APP_KEY,
  cache: {
    driver: CACHE_DRIVER,
    prefix: CACHE_PREFIX,
  },
  docs: {
    enabled: DOCS_ENABLED,
    title: DOCS_TITLE,
    version: DOCS_VERSION,
    path: DOCS_PATH,
    theme: DOCS_THEME,
  },
};
