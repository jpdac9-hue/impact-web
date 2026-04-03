// Client centralisé pour appeler l'API NestJS
// Remplace les appels directs à Supabase dans les routes API

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message ?? `Erreur ${res.status}`);
  }

  return res.json();
}

// ─── Merchants ───────────────────────────────

export const getMerchants = () =>
  apiFetch<any[]>('/merchants');

export const getMerchant = (id: string) =>
  apiFetch<any>(`/merchants/${id}`);

export const getMerchantByDomain = (domain: string) =>
  apiFetch<any>(`/merchants/domain?q=${encodeURIComponent(domain)}`);

// ─── Clicks ──────────────────────────────────

export const recordClick = (
  token: string,
  merchantId: string,
  productTitle?: string,
) =>
  apiFetch<any>('/clicks', {
    method: 'POST',
    body: JSON.stringify({ merchantId, productTitle }),
  }, token);

export const getMyClicks = (token: string) =>
  apiFetch<any[]>('/clicks/me', {}, token);

export const getMyStats = (token: string) =>
  apiFetch<any>('/clicks/me/stats', {}, token);

// ─── Users ───────────────────────────────────

export const getMe = (token: string) =>
  apiFetch<any>('/users/me', {}, token);

export const syncUser = (token: string) =>
  apiFetch<any>('/users/sync', { method: 'POST' }, token);

export const updateName = (token: string, name: string) =>
  apiFetch<any>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  }, token);

// ─── Payouts ─────────────────────────────────

export const getMyPayouts = (token: string) =>
  apiFetch<any[]>('/payouts/me', {}, token);

export const requestPayout = (
  token: string,
  method: string,
  details: string,
) =>
  apiFetch<any>('/payouts', {
    method: 'POST',
    body: JSON.stringify({ method, details }),
  }, token);

export const getPayoutSettings = (token: string) =>
  apiFetch<any>('/payouts/settings', {}, token);

export const savePayoutSettings = (
  token: string,
  method: string,
  details: string,
) =>
  apiFetch<any>('/payouts/settings', {
    method: 'POST',
    body: JSON.stringify({ method, details }),
  }, token);