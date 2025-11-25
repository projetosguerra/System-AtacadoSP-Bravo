export async function fetchAuth(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem('authToken');
  const headers: Record<string,string> = {};
  if (init.headers) {
    const h = init.headers as any;
    Object.keys(h).forEach(k => { headers[k] = h[k]; });
  }
  if (!headers['Content-Type'] && init.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    } catch {}
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?expired=1';
    }
  }

  return response;
}