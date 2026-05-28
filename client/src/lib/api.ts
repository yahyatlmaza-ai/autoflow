const TOKEN_KEY = 'af_session_token';

export const getToken = (): string | null => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const authHeaders = (): Record<string, string> => {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

const req = async <T = any>(method: string, url: string, body?: any): Promise<T> => {
  const res = await fetch(url, {
    method, headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const api = {
  get:    <T = any>(u: string)              => req<T>('GET', u),
  post:   <T = any>(u: string, b?: any)    => req<T>('POST', u, b),
  put:    <T = any>(u: string, b?: any)    => req<T>('PUT', u, b),
  delete: <T = any>(u: string, b?: any)    => req<T>('DELETE', u, b),
};

export const AUTH = {
  login:      (email: string, password: string, fingerprint?: string) =>
    api.post('/api/auth', { action: 'login', email, password, fingerprint }),
  signup:     (d: any) =>
    api.post('/api/auth', { action: 'signup', ...d }),
  verifyOtp:  (registrationId: string, code: string, email: string) =>
    api.post('/api/auth', { action: 'verify_otp', registration_id: registrationId, email, code }),
  resendOtp:  (registrationId: string, email: string) =>
    api.post('/api/auth', { action: 'resend_otp', registration_id: registrationId, email }),
  forgotPass: (email: string) =>
    api.post('/api/auth', { action: 'forgot_password', email }),
  logout:     () =>
    api.post('/api/auth', { action: 'logout' }),
};

export const ORDERS = {
  list:    (p?: any) => api.get('/api/orders' + (p ? '?' + new URLSearchParams(p).toString() : '')),
  create:  (d: any)  => api.post('/api/orders', d),
  update:  (d: any)  => api.put('/api/orders', d),
  remove:  (id: string) => api.delete('/api/orders', { id }),
  bulk:    (ids: string[], status: string) => api.post('/api/orders/bulk', { ids, status }),
  export:  (params?: any) => fetch('/api/orders/export' + (params ? '?' + new URLSearchParams(params).toString() : ''), { headers: authHeaders() }),
  history: (id: string) => api.get(`/api/orders/${id}/history`),
};

export const ANALYTICS  = { get:  ()        => api.get('/api/analytics') };
export const NOTIFS     = {
  list:     ()           => api.get('/api/notifications'),
  unread:   ()           => api.get('/api/notifications/unread'),
  markRead: (id?: string) => api.put('/api/notifications', id ? { id } : { mark_all: true }),
  remove:   (id: string) => api.delete('/api/notifications', { id }),
};
export const STORES     = {
  list:   ()         => api.get('/api/stores'),
  create: (d: any)  => api.post('/api/stores', d),
  remove: (id: string) => api.delete('/api/stores', { id }),
};
export const CUSTOMERS  = { list: () => api.get('/api/customers') };
export const PROFILE    = { get: () => api.get('/api/profiles'), update: (d: any) => api.put('/api/profiles', d) };
export const SETTINGS   = { get: () => api.get('/api/settings'),  update: (d: any) => api.put('/api/settings', d) };
export const PLANS      = { list: () => api.get('/api/plans') };
export const LOGS       = {
  list: (limit = 30)   => api.get(`/api/logs?limit=${limit}`),
  add:  (action: string, entity: string, entityId: string, metadata?: any) =>
    api.post('/api/logs', { action, entity, entity_id: entityId, metadata }),
};
export const TRIAL      = { status: () => api.get('/api/trial/status') };
export const ADMIN      = {
  stats:         () => api.get('/api/admin?resource=stats'),
  users:         () => api.get('/api/admin?resource=users&limit=200'),
  subscriptions: () => api.get('/api/admin?resource=subscriptions'),
  logs:          () => api.get('/api/admin?resource=logs'),
  action:        (body: any) => api.post('/api/admin/action', body),
  devices:       () => api.get('/api/admin/devices'),
};
