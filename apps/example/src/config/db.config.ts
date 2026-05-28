const dbName = 'apps/example';

export const dbConfig = {
  connection: process.env.DB_CONNECTION || 'mongodb',
  // ── MongoDB ────────────────────────────────────────────────────────────────
  // MONGO_URI takes precedence over host/port when set.
  uri:      process.env.MONGO_URI || process.env.MONGODB_URI
              || `mongodb://${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 27017}`,
  database: process.env.DB_NAME || dbName,
  // Replica set: set MONGO_REPLICA_SET to the set name to enable replica-set mode.
  replicaSet:         process.env.MONGO_REPLICA_SET             || undefined,
  // directConnection: 'true' for standalone, 'false' for replica set (auto if unset).
  directConnection:   process.env.MONGO_DIRECT_CONNECTION       || undefined,
  // retryWrites: 'true' for replica set, 'false' for standalone (auto if unset).
  retryWrites:        process.env.MONGO_RETRY_WRITES            || undefined,
  serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
};

export async function initDatabase() {
  const { initDatabase: init } = await import('@lara-node/db');
  return init();
}

export default dbConfig;
