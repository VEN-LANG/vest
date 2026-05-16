export const dbConfig = {
  connection: process.env.DB_CONNECTION || 'mongodb',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 27017,
  database: process.env.DB_NAME || 'lara_app',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  pool: { limit: Number(process.env.DB_POOL_LIMIT) || 10 },
};

export default dbConfig;
