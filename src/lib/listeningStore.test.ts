import { beforeEach, describe, expect, it, vi } from 'vitest';

const idb = vi.hoisted(() => {
  const map = new Map<string, unknown>();
  return {
    map,
    get: vi.fn(async (key: string) => map.get(key)),
    set: vi.fn(async (key: string, value: unknown) => void map.set(key, value)),
    del: vi.fn(async (key: string) => void map.delete(key)),
  };
});
vi.mock('idb-keyval', () => idb);

import {
  deleteListeningSession,
  fetchListeningSessions,
  getListeningMedia,
  getListeningSession,
  minutesListenedToday,
  saveListeningMedia,
  saveListeningSession,
} from './listeningStore';
import { displayProgress, type ListeningPersistedSession } from './listeningTypes';

const session = (overrides?: Partial<ListeningPersistedSession>): ListeningPersistedSession => ({
  id: 's1',
  modeID: 'listen-from-text',
  title: 'T',
  languageId: 'english',
  level: 'B1',
  createdAt: 1000,
  updatedAt: 1000,
  durationSeconds: 60,
  elapsedSeconds: 0,
  progress: 0,
  playbackPosition: 0,
  voiceSpeed: 'normal',
  voiceType: 'default',
  showTextWhileListening: false,
  addQuestions: true,
  questions: [],
  selectedAnswers: {},
  status: 'draft',
  ...overrides,
});

describe('listeningStore', () => {
  beforeEach(() => {
    idb.map.clear();
    vi.clearAllMocks();
  });

  it('save upserts + stamps updatedAt; fetch sorts by updatedAt desc', async () => {
    await saveListeningSession(session({ id: 'a' }));
    await new Promise((r) => setTimeout(r, 5));
    await saveListeningSession(session({ id: 'b' }));
    const all = await fetchListeningSessions();
    expect(all.map((s) => s.id)).toEqual(['b', 'a']);
    expect(all[0].updatedAt).toBeGreaterThan(1000);
    const got = await getListeningSession('a');
    expect(got?.id).toBe('a');
  });

  it('delete removes the session AND its media blob', async () => {
    await saveListeningMedia('m1', new Blob(['x']));
    await saveListeningSession(session({ id: 'a', mediaKey: 'm1' }));
    expect(await getListeningMedia('m1')).toBeDefined();
    await deleteListeningSession('a');
    expect(await getListeningSession('a')).toBeUndefined();
    expect(await getListeningMedia('m1')).toBeUndefined();
  });

  it('minutesListenedToday counts only completed sessions updated today', async () => {
    const now = Date.now();
    await saveListeningSession(session({ id: 'done', status: 'completed', elapsedSeconds: 300 }));
    await saveListeningSession(session({ id: 'wip', status: 'inProgress', elapsedSeconds: 600 }));
    expect(await minutesListenedToday(now)).toBe(5);
  });
});

describe('displayProgress (iOS rule)', () => {
  it('completed → 1; questions split 50/50 capped 0.99; else raw capped 0.99', () => {
    expect(displayProgress(session({ status: 'completed' }))).toBe(1);
    const q = { id: 'q1', prompt: '', options: [], correctIndex: 0, type: 'details' as const };
    const withQ = session({
      progress: 1,
      questions: [q, { ...q, id: 'q2' }],
      selectedAnswers: { q1: 0 },
    });
    expect(displayProgress(withQ)).toBeCloseTo(0.75);
    const full = session({ progress: 1, questions: [q], selectedAnswers: { q1: 0 } });
    expect(displayProgress(full)).toBe(0.99);
    expect(displayProgress(session({ progress: 0.7, addQuestions: false }))).toBe(0.7);
  });
});
