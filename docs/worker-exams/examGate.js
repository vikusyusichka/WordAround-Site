/**
 * Settings for the exam-prep AI tasks, applied in the Worker's prompt proxy.
 * Copy into src/.
 *
 * Why this exists: exam tasks produce long answers (a 900-word IELTS reading
 * passage; a full examiner report). The proxy's default 2048-token output cap
 * is shared with Gemini 2.5's hidden "thinking", which can use almost all of
 * it — the answer then arrives cut off and every provider is reported as
 * unavailable. Exam tasks therefore get a larger cap and a small thinking
 * budget.
 *
 * Optional per-user daily limits need a KV namespace bound as EXAM_QUOTA.
 */

import { userFromRequest } from "./firebaseAuth.js";
import { isPremium } from "./firestoreAdmin.js";

export const EXAM_TASKS = new Set([
  "exam_task_generation",
  "exam_writing_scoring",
  "exam_speaking_scoring",
]);

export const EXAM_MAX_TOKENS = 8192;
export const EXAM_THINKING_BUDGET = 512;

/**
 * Returns null when the request may go ahead, or a Response to send instead.
 * With REQUIRE_AUTH_FOR_EXAMS="on" the caller must be signed in; with an
 * EXAM_QUOTA KV binding each user gets EXAM_DAILY_LIMIT calls a day
 * (EXAM_DAILY_LIMIT_PREMIUM for Premium users).
 */
export async function examGate(request, env, json) {
  if (env.REQUIRE_AUTH_FOR_EXAMS !== "on") return null;
  const user = await userFromRequest(request, env);
  if (!user) return json({ error: "Sign in again to continue." }, 401);
  if (!env.EXAM_QUOTA) return null;

  const day = new Date().toISOString().slice(0, 10);
  const key = `exam:${user.uid}:${day}`;
  const used = Number((await env.EXAM_QUOTA.get(key)) || 0);
  const limit = (await isPremium(env, user.uid))
    ? Number(env.EXAM_DAILY_LIMIT_PREMIUM || 400)
    : Number(env.EXAM_DAILY_LIMIT || 40);
  if (used >= limit) {
    return json({ error: "Daily limit for exam practice reached. Try again tomorrow." }, 429);
  }
  await env.EXAM_QUOTA.put(key, String(used + 1), { expirationTtl: 60 * 60 * 36 });
  return null;
}
