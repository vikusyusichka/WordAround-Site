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
} as const;
