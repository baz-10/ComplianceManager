const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_ENDPOINT = '/api/csrf-token';

let csrfToken: string | null = null;
let pendingTokenRequest: Promise<void> | null = null;

function isSameOrigin(url: string): boolean {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const target = new URL(url);
      return target.origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return true;
}

async function fetchCsrfToken(originalFetch: typeof window.fetch) {
  try {
    const response = await originalFetch(CSRF_ENDPOINT, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      csrfToken = null;
      return;
    }

    const data = await response.json();
    if (data?.csrfToken) {
      csrfToken = data.csrfToken;
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token', error);
    csrfToken = null;
  }
}

async function ensureCsrfToken(originalFetch: typeof window.fetch) {
  if (csrfToken) {
    return;
  }
  if (!pendingTokenRequest) {
    pendingTokenRequest = fetchCsrfToken(originalFetch).finally(() => {
      pendingTokenRequest = null;
    });
  }
  await pendingTokenRequest;
}

export function setupCsrfProtection() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const method = (init?.method || request?.method || 'GET').toUpperCase();
    const url = request?.url ?? (typeof input === 'string' ? input : (input as URL).toString());
    const sameOrigin = Boolean(url) && isSameOrigin(url);
    const headers = new Headers(init?.headers ?? request?.headers ?? undefined);

    if (!SAFE_METHODS.has(method) && url && sameOrigin) {
      await ensureCsrfToken(originalFetch);
      if (csrfToken) {
        headers.set(CSRF_HEADER, csrfToken);
      }
    }

    const finalInit: RequestInit = {
      ...init,
      headers,
      credentials:
        init?.credentials ??
        request?.credentials ??
        (sameOrigin ? 'include' : undefined),
    };

    const response = await originalFetch(input as any, finalInit);
    const newToken = response.headers.get(CSRF_HEADER);
    if (newToken) {
      csrfToken = newToken;
    }
    return response;
  };

  void ensureCsrfToken(originalFetch);
}
