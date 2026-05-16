/**
 * Role model — mock-based unit tests.
 * Uses vi.hoisted() + __setMongoDbForTest to intercept internal DB calls.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Hoisted mock state ───────────────────────────────────────────────────────

const {
  mockInsertOne, mockFindOne, mockUpdateOne,
  mockToArray, mockFind, mockCollection,
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
  const mockInsertOne    = vi.fn().mockResolvedValue({ insertedId: 'bbbbbbbbbbbbbbbbbbbbbbbb' });
  const mockFindOne      = vi.fn().mockResolvedValue(null);
  const mockUpdateOne    = vi.fn().mockResolvedValue({ modifiedCount: 1 });
  const mockAggregate    = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
  const mockCollection   = vi.fn().mockReturnValue({
    find: mockFind, findOne: mockFindOne, insertOne: mockInsertOne,
    updateOne: mockUpdateOne, deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    countDocuments: vi.fn().mockResolvedValue(0), aggregate: mockAggregate,
  });
  return { mockInsertOne, mockFindOne, mockUpdateOne, mockToArray, mockFind, mockCollection };
});

// ─── Imports (after mock) ─────────────────────────────────────────────────────

import Role from '../../app/Models/Role';
import { __setMongoDbForTest } from '@lara-node/db';

beforeAll(() => {
  __setMongoDbForTest({ collection: mockCollection } as any);
});

afterAll(() => {
  __setMongoDbForTest(undefined);
});

const FAKE_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb'; // valid 24-char hex for ObjectId

function fakeRole(overrides: Record<string, unknown> = {}) {
  return { _id: FAKE_ID, id: FAKE_ID, name: 'Admin', slug: 'admin', ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindOne.mockResolvedValue(null);
  mockToArray.mockResolvedValue([]);
  mockInsertOne.mockResolvedValue({ insertedId: FAKE_ID });
  mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  mockCollection.mockReturnValue({
    find: mockFind, findOne: mockFindOne, insertOne: mockInsertOne,
    updateOne: mockUpdateOne, deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
  });
  __setMongoDbForTest({ collection: mockCollection } as any);
});

describe('Role model — CRUD', () => {
  it('creates a role and calls insertOne', async () => {
    mockFindOne.mockResolvedValueOnce(fakeRole());
    const role = await Role.create({ name: 'Admin', slug: 'admin' });
    expect(mockInsertOne).toHaveBeenCalledOnce();
    expect(role).toBeInstanceOf(Role);
  });

  it('find returns null when not found', async () => {
    expect(await Role.find(99)).toBeNull();
  });

  it('find returns Role when found', async () => {
    mockToArray.mockResolvedValueOnce([fakeRole({ id: 5 })]);
    const role = await Role.find(5);
    expect(role).toBeInstanceOf(Role);
    expect(role!.getAttribute('slug')).toBe('admin');
  });

  it('all returns array of Role instances', async () => {
    mockToArray.mockResolvedValueOnce([fakeRole({ id: 1 }), fakeRole({ id: 2, slug: 'user' })]);
    const roles = await Role.all();
    expect(roles).toHaveLength(2);
    expect(roles[0]).toBeInstanceOf(Role);
  });

  it('update calls updateOne with $set', async () => {
    mockToArray.mockResolvedValueOnce([fakeRole()]);
    const role = await Role.find(1);
    await role!.update({ description: 'Updated' });
    expect(mockUpdateOne).toHaveBeenCalledOnce();
    expect(mockUpdateOne.mock.calls[0][1]).toMatchObject({ $set: { description: 'Updated' } });
  });

  it('fillable includes expected fields', () => {
    expect(Role.fillable).toContain('name');
    expect(Role.fillable).toContain('slug');
  });
});
