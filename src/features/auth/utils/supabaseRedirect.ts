import type { Session, User } from '../../../types/auth';

type RedirectSource = 'hash' | 'search';

type RedirectResult =
  | {
      source: RedirectSource;
      session: Session;
      user: User;
      type?: string | null;
    }
  | {
      source: RedirectSource;
      error: string;
      errorDescription?: string | null;
    };

const AUTH_DETECT_KEYS = [
  'access_token',
  'refresh_token',
  'error',
  'error_code',
  'error_description',
  'code',
  'token',
  'token_hash',
];

const AUTH_CLEAN_KEYS = [
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'type',
  'code',
  'token',
  'token_hash',
  'error',
  'error_code',
  'error_description',
];

const hasAuthParams = (params: URLSearchParams) => AUTH_DETECT_KEYS.some((key) => params.has(key));

const parseAuthParams = (url: URL): { params: URLSearchParams; source: RedirectSource } | null => {
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
  if (hasAuthParams(hashParams)) {
    return { params: hashParams, source: 'hash' };
  }
  if (hasAuthParams(url.searchParams)) {
    return { params: url.searchParams, source: 'search' };
  }
  return null;
};

const resolveExpiresIn = (params: URLSearchParams): number | null => {
  const expiresInRaw = params.get('expires_in');
  if (expiresInRaw) {
    const expiresIn = Number.parseInt(expiresInRaw, 10);
    return Number.isFinite(expiresIn) ? expiresIn : null;
  }

  const expiresAtRaw = params.get('expires_at');
  if (expiresAtRaw) {
    const expiresAt = Number.parseInt(expiresAtRaw, 10);
    if (!Number.isFinite(expiresAt)) return null;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.max(0, expiresAt - nowSeconds);
  }

  return null;
};

const decodeBase64Url = (value: string) => {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
  const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(normalized);
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const parseUserFromAccessToken = (token: string): User => {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('Invalid JWT');
  }
  const decoded = JSON.parse(decodeBase64Url(payload)) as unknown;
  if (!isRecord(decoded)) {
    throw new Error('Invalid JWT payload');
  }
  const metadata = isRecord(decoded.user_metadata) ? decoded.user_metadata : {};
  const username =
    getString(metadata.username) ??
    getString(metadata.user_name) ??
    getString(metadata.preferred_username) ??
    getString(metadata.name) ??
    '';
  const displayName =
    getString(metadata.display_name) ??
    getString(metadata.full_name) ??
    getString(metadata.name) ??
    getString(metadata.username) ??
    '';
  const id = getString(decoded.sub) ?? '';
  const email = getString(decoded.email) ?? '';

  return {
    id,
    email,
    user_metadata: {
      username,
      display_name: displayName,
    },
  };
};

export const hasSupabaseAuthParams = (url = window.location.href): boolean => {
  try {
    return Boolean(parseAuthParams(new URL(url)));
  } catch {
    return false;
  }
};

export const parseSupabaseAuthRedirect = (url = window.location.href): RedirectResult | null => {
  const parsedUrl = new URL(url);
  const entry = parseAuthParams(parsedUrl);
  if (!entry) return null;

  const { params, source } = entry;
  const error = params.get('error') ?? params.get('error_code');
  const errorDescription = params.get('error_description');
  if (error || errorDescription) {
    return {
      source,
      error: error ?? 'auth_error',
      errorDescription,
    };
  }

  const code = params.get('code');
  const tokenHash = params.get('token_hash') ?? params.get('token');
  if (code || tokenHash) {
    return {
      source,
      error: 'unsupported_flow',
      errorDescription:
        'Unsupported Supabase redirect flow. Please update Supabase auth redirect settings to use the implicit flow.',
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = resolveExpiresIn(params);

  if (!accessToken || !refreshToken || expiresIn === null) {
    return {
      source,
      error: 'missing_tokens',
      errorDescription: 'Missing access token or refresh token in redirect URL.',
    };
  }

  try {
    const user = parseUserFromAccessToken(accessToken);
    return {
      source,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        user,
      },
      user,
      type: params.get('type'),
    };
  } catch (error: unknown) {
    return {
      source,
      error: 'invalid_token',
      errorDescription: error instanceof Error ? error.message : 'Failed to parse access token.',
    };
  }
};

export const clearSupabaseAuthParams = (url = window.location.href) => {
  const parsedUrl = new URL(url);
  const entry = parseAuthParams(parsedUrl);
  if (!entry) return;

  for (const key of AUTH_CLEAN_KEYS) {
    parsedUrl.searchParams.delete(key);
  }

  if (entry.source === 'hash') {
    parsedUrl.hash = '';
  }

  const cleanUrl = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);
};
