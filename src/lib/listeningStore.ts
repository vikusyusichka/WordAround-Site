/* Local listening persistence — web port of LocalListeningSessionStore
   (iOS keeps listening_sessions.json + media files in app support; the web
   keeps a session array + media Blobs in IndexedDB via idb-keyval). Session
   records reference media only by `mediaKey` — the Blob lives under its own
   key, mirroring the iOS filename indirection. */
import { del, get, set } from 'idb-keyval';

import type { ListeningPersistedSession } from '@/lib/listeningTypes';

const SESSIONS_KEY = 'wa.listening.sessions.v1';
const MEDIA_PREFIX = 'wa.listening.media.';

export const DAILY_GOAL_MINUTES = 15;

const readAll = async (): Promise<ListeningPersistedSession[]> => {
  try {
    const raw = await get<ListeningPersistedSession[]>(SESSIONS_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const writeAll = (sessions: ListeningPersistedSession[]) => set(SESSIONS_KEY, sessions);

/** All sessions, newest activity first (iOS sort: updatedAt desc). */
export const fetchListeningSessions = async (): Promise<ListeningPersistedSession[]> => {
  const sessions = await readAll();
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getListeningSession = async (
  id: string,
): Promise<ListeningPersistedSession | undefined> => {
  const sessions = await readAll();
  return sessions.find((s) => s.id === id);
};

/** Upsert by id; always stamps updatedAt (iOS parity). */
export const saveListeningSession = async (
  session: ListeningPersistedSession,
): Promise<ListeningPersistedSession> => {
  const stamped = { ...session, updatedAt: Date.now() };
  const sessions = await readAll();
  const index = sessions.findIndex((s) => s.id === stamped.id);
  if (index >= 0) sessions[index] = stamped;
  else sessions.push(stamped);
  await writeAll(sessions);
  return stamped;
};

/** Delete the session AND its media blob (iOS deletes the audio file too). */
export const deleteListeningSession = async (id: string): Promise<void> => {
  const sessions = await readAll();
  const target = sessions.find((s) => s.id === id);
  await writeAll(sessions.filter((s) => s.id !== id));
  if (target?.mediaKey) await deleteListeningMedia(target.mediaKey).catch(() => {});
};

/* --- Media blobs --- */

export const saveListeningMedia = async (key: string, blob: Blob): Promise<void> => {
  await set(MEDIA_PREFIX + key, blob);
};

export const getListeningMedia = async (key: string): Promise<Blob | undefined> => {
  try {
    return await get<Blob>(MEDIA_PREFIX + key);
  } catch {
    return undefined;
  }
};

export const deleteListeningMedia = async (key: string): Promise<void> => {
  await del(MEDIA_PREFIX + key);
};

/* --- Daily progress (iOS ListeningHomeViewModel.refreshDailyProgress) --- */

const isSameLocalDay = (a: number, b: number): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

/** Minutes of COMPLETED listening updated today (deduped by id). */
export const minutesListenedToday = async (now: number = Date.now()): Promise<number> => {
  const sessions = await readAll();
  const seen = new Set<string>();
  let seconds = 0;
  for (const s of sessions) {
    if (s.status !== 'completed' || seen.has(s.id)) continue;
    if (!isSameLocalDay(s.updatedAt, now)) continue;
    seen.add(s.id);
    seconds += s.elapsedSeconds;
  }
  return Math.floor(seconds / 60);
};
