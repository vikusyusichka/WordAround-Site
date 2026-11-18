/* Premium billing — the browser side of Stripe Checkout and the Customer
   Portal. The browser never talks to Stripe with a secret: it asks the Worker
   for a Checkout (or Portal) URL, proving who it is with the Firebase ID
   token, and goes there. Stripe calls the Worker's webhook when a payment
   lands, and the Worker writes entitlements/{uid}. See docs/EXAMS-SETUP.md. */
import { auth } from '@/lib/firebase';
import { env } from '@/lib/env';

export type BillingPlan = 'monthly' | 'yearly';

export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingError';
  }
}

const billingBase = (): string => env.billingUrl ?? env.aiWorkerUrl;

const requestRedirect = async (path: string, body: Record<string, unknown>): Promise<string> => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new BillingError('Sign in again to continue.');
  let response: Response;
  try {
    response = await fetch(`${billingBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new BillingError('Could not reach the payment service. Check your connection.');
  }
  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    throw new BillingError(data.error ?? `Payments are not available yet (${response.status}).`);
  }
  return data.url;
};

/** Sends the browser to Stripe Checkout for `plan`. */
export const startCheckout = async (plan: BillingPlan): Promise<void> => {
  const returnUrl = `${window.location.origin}/premium`;
  window.location.assign(await requestRedirect('/api/billing/checkout', { plan, returnUrl }));
};

/** Sends the browser to the Stripe Customer Portal (cancel, change card, invoices). */
export const openBillingPortal = async (): Promise<void> => {
  const returnUrl = `${window.location.origin}/premium`;
  window.location.assign(await requestRedirect('/api/billing/portal', { returnUrl }));
};
