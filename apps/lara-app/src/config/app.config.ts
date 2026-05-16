export const appConfig = {
  name: process.env.APP_NAME || 'Lara App',
  env: process.env.APP_ENV || 'local',
  debug: process.env.APP_DEBUG !== 'false',
  url: process.env.APP_URL || 'http://localhost:3000',
  key: process.env.APP_KEY || '',
  timezone: 'UTC',
};

export default appConfig;
