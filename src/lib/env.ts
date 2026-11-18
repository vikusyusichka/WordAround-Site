/* Runtime-validated environment configuration.
   Vite exposes vars prefixed with VITE_ to import.meta.env. We assert them
   at startup — a missing key is a fatal misconfiguration, not something to
   silently degrade. */

const requireEnv = (name: string): string => {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env.local and fill in the values.`,
    );
  }
  return value;
};

export const env = {
  firebase: {
    apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
    authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnv('VITE_FIREBASE_APP_ID'),
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as
      | string
      | undefined,
  },
  aiWorkerUrl: requireEnv('VITE_AI_WORKER_URL'),
  /* Optional switches for the Exams section (see docs/EXAMS-SETUP.md). Both
     default to off, so nothing changes until the backend for them is live. */
  /** 'on' = mock exams and repeat practice need Premium. Off while there is no way to pay. */
  examsPaywall: import.meta.env.VITE_EXAMS_PAYWALL === 'on',
  /** 'on' = AI requests carry the Firebase ID token. Needs the Worker to allow the header. */
  aiSendIdToken: import.meta.env.VITE_AI_SEND_ID_TOKEN === 'on',
  /** Base URL of the billing endpoints (the AI Worker by default). */
  billingUrl: (import.meta.env.VITE_BILLING_URL as string | undefined) || undefined,
} as const;
