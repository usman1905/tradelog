// Talks to the Express API. The JWT is kept in localStorage and sent as a Bearer token.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'tradelog.token';

export const tokens = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: t => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } }
};

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function request(path, { method = 'GET', body, query, raw = false } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(query || {}).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, v));
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  const token = tokens.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body && JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 401) tokens.clear();
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || `Request failed (${res.status}).`);
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

const signIn = async promise => { const { token, user } = await promise; tokens.set(token); return user; };

export const httpApi = {
  mode: 'live',
  register: data => signIn(request('/api/auth/register', { method: 'POST', body: data })),
  login: data => signIn(request('/api/auth/login', { method: 'POST', body: data })),
  async me() {
    if (!tokens.get()) return null;
    try { return (await request('/api/auth/me')).user; } catch (e) { if (e.status === 401) return null; throw e; }
  },
  logout: async () => tokens.clear(),
  listTrades: query => request('/api/trades', { query }),
  summary: query => request('/api/trades/summary', { query }),
  createTrade: trade => request('/api/trades', { method: 'POST', body: trade }).then(r => r.trade),
  updateTrade: (id, trade) => request(`/api/trades/${id}`, { method: 'PUT', body: trade }).then(r => r.trade),
  deleteTrade: id => request(`/api/trades/${id}`, { method: 'DELETE' }),
  exportCsv: async () => (await request('/api/trades/export.csv', { raw: true })).blob()
};
