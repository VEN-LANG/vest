/**
 * DB class — SQL-specific API tests.
 *
 * This app uses MongoDB (DB_CONNECTION=mongodb). These tests verify:
 *   1. SQL-only methods throw descriptive errors in MongoDB mode so that
 *      callers can understand what to use instead.
 *   2. DB.collection() works correctly in MongoDB mode via __setMongoDbForTest.
 *   3. The DB static interface has all expected methods for both drivers.
 *
 * For a MySQL-mode project the same tests would be rewritten to call
 * DB.select / DB.insert / DB.update / DB.delete and assert on row results.
 */

import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DB, __setMongoDbForTest } from '@lara-node/db';

// ─── Mock Mongo collection for DB.collection() tests ─────────────────────────

const mockFindOne  = vi.fn().mockResolvedValue(null);
const mockFind     = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
const mockInsertOne = vi.fn().mockResolvedValue({ insertedId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
const mockDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
const mockCollection = vi.fn().mockReturnValue({
  findOne: mockFindOne, find: mockFind,
  insertOne: mockInsertOne, updateOne: mockUpdateOne, deleteOne: mockDeleteOne,
  countDocuments: vi.fn().mockResolvedValue(0),
});

beforeAll(() => { __setMongoDbForTest({ collection: mockCollection } as any); });
afterAll(() => { __setMongoDbForTest(undefined); });
beforeEach(() => { vi.clearAllMocks(); mockCollection.mockReturnValue({ findOne: mockFindOne, find: mockFind, insertOne: mockInsertOne, updateOne: mockUpdateOne, deleteOne: mockDeleteOne, countDocuments: vi.fn().mockResolvedValue(0) }); __setMongoDbForTest({ collection: mockCollection } as any); });

// ─── SQL-only guard tests (current DB = MongoDB) ─────────────────────────────

describe('DB SQL methods — descriptive errors in MongoDB mode', () => {
  it('DB.query() throws with a MongoDB-friendly message', async () => {
    await expect(DB.query('SELECT 1')).rejects.toThrow(/mongodb/i);
  });

  it('DB.select() throws with a MongoDB-friendly message', async () => {
    await expect(DB.select('SELECT * FROM users')).rejects.toThrow(/mongodb/i);
  });

  it('DB.insert() throws with a MongoDB-friendly message', async () => {
    await expect(DB.insert('INSERT INTO users VALUES (?)', [1])).rejects.toThrow(/mongodb/i);
  });

  it('DB.update() throws with a MongoDB-friendly message', async () => {
    await expect(DB.update('UPDATE users SET name = ? WHERE id = ?', ['x', 1])).rejects.toThrow(/mongodb/i);
  });

  it('DB.delete() throws with a MongoDB-friendly message', async () => {
    await expect(DB.delete('DELETE FROM users WHERE id = ?', [1])).rejects.toThrow(/mongodb/i);
  });

  it('DB.statement() throws with a MongoDB-friendly message', async () => {
    await expect(DB.statement('CREATE TABLE t (id INT)')).rejects.toThrow(/mongodb/i);
  });
});

// ─── MongoDB collection API (the "SQL equivalent" in Mongo mode) ─────────────

describe('DB.collection() — MongoDB read/write operations', () => {
  it('findOne returns the document from the mock', async () => {
    mockFindOne.mockResolvedValueOnce({ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Alice' });
    const col = DB.collection('users');
    const doc = await col.findOne({ name: 'Alice' });
    expect(doc).toMatchObject({ name: 'Alice' });
  });

  it('find().toArray() returns an array of documents', async () => {
    mockFind.mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ name: 'Alice' }, { name: 'Bob' }]) });
    const col = DB.collection('users');
    const docs = await col.find({}).toArray();
    expect(docs).toHaveLength(2);
  });

  it('insertOne returns an insertedId', async () => {
    mockInsertOne.mockResolvedValueOnce({ insertedId: 'bbbbbbbbbbbbbbbbbbbbbbbb' });
    const col = DB.collection('users');
    const result = await col.insertOne({ name: 'Charlie' });
    expect(result.insertedId).toBe('bbbbbbbbbbbbbbbbbbbbbbbb');
  });

  it('updateOne returns modifiedCount', async () => {
    mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });
    const col = DB.collection('users');
    const result = await col.updateOne({ name: 'Alice' }, { $set: { name: 'Alice Updated' } });
    expect(result.modifiedCount).toBe(1);
  });

  it('deleteOne returns deletedCount', async () => {
    mockDeleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    const col = DB.collection('users');
    const result = await col.deleteOne({ name: 'Alice' });
    expect(result.deletedCount).toBe(1);
  });
});

// ─── Static API contract ──────────────────────────────────────────────────────

describe('DB — static API contract', () => {
  it('has expected static methods for both SQL and MongoDB', () => {
    // SQL methods (MySQL mode)
    expect(typeof DB.query).toBe('function');
    expect(typeof DB.select).toBe('function');
    expect(typeof DB.insert).toBe('function');
    expect(typeof DB.update).toBe('function');
    expect(typeof DB.delete).toBe('function');
    expect(typeof DB.statement).toBe('function');
    expect(typeof DB.transaction).toBe('function');
    // MongoDB method
    expect(typeof DB.collection).toBe('function');
  });

  it('DB.executeQuery is a static async function', () => {
    expect(typeof DB.executeQuery).toBe('function');
  });
});
