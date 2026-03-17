import { supabase } from '@/integrations/supabase/client';

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`;

/**
 * Centralised helper to call the uazapi-proxy edge function.
 *
 * Handles auth token injection automatically.
 * Returns the parsed JSON response.
 * Throws on HTTP errors with the message from the proxy when available.
 */
export async function callUazapiProxy<T = any>(
  body: Record<string, unknown>,
): Promise<T> {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error('Sessão expirada');

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Erro ${response.status}`);
  }

  return response.json();
}

/**
 * Variant that accepts a pre-fetched access token (useful in loops
 * where you don't want to call getSession() on every iteration).
 */
export async function callUazapiProxyWithToken<T = any>(
  body: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Erro ${response.status}`);
  }

  return response.json();
}
