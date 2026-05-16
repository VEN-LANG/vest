// Set DB env vars before any @lara-node/db module loads — connection.ts reads
// process.env at module-level and the constant cannot be changed after that.
process.env.DB_CONNECTION = 'mongodb';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '27017';
process.env.DB_NAME = 'lara_app_test';

import 'reflect-metadata';

import { vi } from 'vitest';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
