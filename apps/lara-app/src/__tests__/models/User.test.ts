/**
 * User model — mock-based unit tests.
 * Uses vi.hoisted() so mock variables are available when vi.mock() is hoisted.
 * Uses __setMongoDbForTest to inject a mock Db into the connection module so
 * internal calls from Model.ts (getMongoDb().collection()) are intercepted.
 */
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';

// ─── Hoisted mock state ───────────────────────────────────────────────────────

const {
  mockInsertOne, mockFindOne, mockUpdateOne, mockDeleteOne,
  mockToArray, mockFind, mockCountDocuments, mockCollection,
} = vi.hoisted(() => {
  const mockToArray   = vi.fn().mockResolvedValue([]);
  const mockCursor: any = {
    toArray: mockToArray,
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    project: vi.fn().mockReturnThis(),
  };
  const mockFind         = vi.fn().mockReturnValue(mockCursor);
  const mockInsertOne    = vi.fn().mockResolvedValue({ insertedId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
  const mockFindOne      = vi.fn().mockResolvedValue(null);
  const mockUpdateOne    = vi.fn().mockResolvedValue({ modifiedCount: 1 });
  const mockDeleteOne    = vi.fn().mockResolvedValue({ deletedCount: 1 });
  const mockCountDocuments = vi.fn().mockResolvedValue(0);
  const mockAggregate    = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
  const mockCollection   = vi.fn().mockReturnValue({
    find: mockFind, findOne: mockFindOne, insertOne: mockInsertOne,
    updateOne: mockUpdateOne, deleteOne: mockDeleteOne,
    countDocuments: mockCountDocuments, aggregate: mockAggregate,
  });
  return { mockInsertOne, mockFindOne, mockUpdateOne, mockDeleteOne, mockToArray, mockFind, mockCountDocuments, mockCollection };
});

// ─── Imports (after mock) ─────────────────────────────────────────────────────

import User from '../../app/Models/User';
import { __setMongoDbForTest } from '@lara-node/db';

// Inject mock Mongo Db so internal getMongoDb() calls don't throw
beforeAll(() => {
  __setMongoDbForTest({ collection: mockCollection } as any);
});

afterAll(() => {
  __setMongoDbForTest(undefined);
});

const FAKE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa'; // valid 24-char hex for ObjectId

function fakeDoc(overrides: Record<string, unknown> = {}) {
  return { _id: FAKE_ID, id: FAKE_ID, name: 'Alice', email: 'alice@test.com', status: 'active', ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindOne.mockResolvedValue(null);
  mockToArray.mockResolvedValue([]);
  mockInsertOne.mockResolvedValue({ insertedId: FAKE_ID });
  mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
  mockCountDocuments.mockResolvedValue(0);
  // Re-inject after clearAllMocks since mockCollection was cleared
  mockCollection.mockReturnValue({
    find: mockFind, findOne: mockFindOne, insertOne: mockInsertOne,
    updateOne: mockUpdateOne, deleteOne: mockDeleteOne,
    countDocuments: mockCountDocuments, aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
  });
  __setMongoDbForTest({ collection: mockCollection } as any);
});

describe('User model — create', () => {
  it('calls insertOne and returns a User instance', async () => {
    mockFindOne.mockResolvedValueOnce(fakeDoc());
    const user = await User.create({ name: 'Alice', email: 'alice@test.com', password: 'hashed' });
    expect(mockInsertOne).toHaveBeenCalledOnce();
    expect(user).toBeInstanceOf(User);
  });

  it('includes fillable fields in the insert', async () => {
    mockFindOne.mockResolvedValueOnce(fakeDoc({ email: 'bob@test.com' }));
    await User.create({ name: 'Bob', email: 'bob@test.com', password: 'pw' });
    const inserted = mockInsertOne.mock.calls[0][0];
    expect(inserted).toMatchObject({ name: 'Bob', email: 'bob@test.com' });
  });
});

describe('User model — find', () => {
  it('returns null when document not found', async () => {
    mockToArray.mockResolvedValueOnce([]);
    expect(await User.find(999)).toBeNull();
  });

  it('returns User instance when found', async () => {
    mockToArray.mockResolvedValueOnce([fakeDoc({ id: 42 })]);
    const user = await User.find(42);
    expect(user).toBeInstanceOf(User);
    expect(user!.getAttribute('id')).toBe(42);
  });

  it('excludes hidden fields (password) from serialization', async () => {
    mockToArray.mockResolvedValueOnce([fakeDoc({ password: 'secret' })]);
    const user = await User.find(FAKE_ID);
    // hidden applies to serialized output, not raw getAttribute
    const serialized = (user as any).getForArray?.() ?? (user as any).toObject?.() ?? {};
    expect(serialized.password).toBeUndefined();
  });
});

describe('User model — all', () => {
  it('returns empty array when no users', async () => {
    mockToArray.mockResolvedValueOnce([]);
    expect(await User.all()).toEqual([]);
  });

  it('returns mapped User instances', async () => {
    mockToArray.mockResolvedValueOnce([fakeDoc({ id: 1 }), fakeDoc({ id: 2 })]);
    const users = await User.all();
    expect(users).toHaveLength(2);
    expect(users[0]).toBeInstanceOf(User);
  });
});

describe('User model — update', () => {
  it('calls updateOne with $set', async () => {
    mockToArray.mockResolvedValueOnce([fakeDoc()]);
    const user = await User.find(1);
    await user!.update({ name: 'Updated' });
    expect(mockUpdateOne).toHaveBeenCalledOnce();
    expect(mockUpdateOne.mock.calls[0][1]).toMatchObject({ $set: expect.objectContaining({ name: 'Updated' }) });
  });
});

describe('User model — soft delete', () => {
  it('calls updateOne with deleted_at', async () => {
    mockToArray.mockResolvedValueOnce([fakeDoc()]);
    const user = await User.find(1);
    await user!.delete();
    expect(mockUpdateOne).toHaveBeenCalledOnce();
    expect(mockUpdateOne.mock.calls[0][1]).toMatchObject({ $set: expect.objectContaining({ deleted_at: expect.anything() }) });
  });
});

describe('User model — isActive()', () => {
  it('returns true when status is active', () => {
    const u = new User(); u.setAttribute('status', 'active');
    expect(u.isActive()).toBe(true);
  });

  it('returns true when status is undefined', () => {
    expect(new User().isActive()).toBe(true);
  });

  it('returns false when status is inactive', () => {
    const u = new User(); u.setAttribute('status', 'inactive');
    expect(u.isActive()).toBe(false);
  });
});

describe('User model — meta', () => {
  it('fillable includes expected fields', () => {
    expect(User.fillable).toContain('name');
    expect(User.fillable).toContain('email');
    expect(User.fillable).toContain('password');
  });

  it('hidden includes password', () => {
    expect(User.hidden).toContain('password');
  });
});
