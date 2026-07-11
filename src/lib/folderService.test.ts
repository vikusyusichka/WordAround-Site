import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Mock Firebase so the service can be tested without initializing the SDK. */
vi.mock('@/lib/firebase', () => ({ db: { __db: true } }));

const fs = vi.hoisted(() => {
  class Timestamp {
    millis: number;
    constructor(m: number) {
      this.millis = m;
    }
    static fromMillis(m: number) {
      return new Timestamp(m);
    }
    toMillis() {
      return this.millis;
    }
  }
  return {
    Timestamp,
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn(),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((_db: unknown, ...segs: string[]) => ({ path: segs.join('/') })),
    doc: vi.fn((col: { path: string }, id: string) => ({ path: `${col.path}/${id}` })),
    query: vi.fn((col: unknown, ...rest: unknown[]) => ({ col, rest })),
    orderBy: vi.fn((field: string, dir: string) => ({ field, dir })),
  };
});

vi.mock('firebase/firestore', () => fs);

import { createFolder, deleteFolder, fetchFolders } from './folderService';
import type { Folder } from './models';

const folder: Folder = {
  id: 'f1',
  ownerUID: 'u1',
  title: 'Travel',
  description: 'Trips',
  colorHex: '#4169F5',
  createdAt: 1_000,
  updatedAt: 2_000,
};

describe('folderService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createFolder writes to users/{uid}/folders/{id} with Timestamps', async () => {
    await createFolder(folder);
    expect(fs.setDoc).toHaveBeenCalledOnce();
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/folders/f1');
    expect(data.title).toBe('Travel');
    expect(data.createdAt).toBeInstanceOf(fs.Timestamp);
    expect(data.createdAt.toMillis()).toBe(1_000);
  });

  it('fetchFolders maps docs and converts Timestamps to millis', async () => {
    fs.getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: 'f1',
            ownerUID: 'u1',
            title: 'Travel',
            description: 'Trips',
            colorHex: '#4169F5',
            createdAt: new fs.Timestamp(5_000),
            updatedAt: new fs.Timestamp(6_000),
          }),
        },
      ],
    });

    const result = await fetchFolders('u1');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Travel');
    expect(result[0].createdAt).toBe(5_000);
    expect(fs.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('deleteFolder targets the right doc', async () => {
    await deleteFolder('f1', 'u1');
    expect(fs.deleteDoc).toHaveBeenCalledOnce();
    expect(fs.deleteDoc.mock.calls[0][0].path).toBe('users/u1/folders/f1');
  });
});
