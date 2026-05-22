const dbName = 'apps/example';

export const dbConfig = {
  connection: process.env.DB_CONNECTION || 'mysql',
  // ── MySQL ──────────────────────────────────────────────────────────────────
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || dbName,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  pool: {
    limit: Number(process.env.DB_POOL_LIMIT) || 10,
  },
  // Set DB_SOCKET_PATH (or DB_SOCKET) to use a Unix socket instead of host/port.
  // Common paths: /var/run/mysqld/mysqld.sock  /tmp/mysql.sock
  socketPath: process.env.DB_SOCKET_PATH || process.env.DB_SOCKET || undefined,
};

export async function initDatabase() {
  const { initDatabase: init } = await import('@lara-node/db');
  return init();
}

export default dbConfig;
