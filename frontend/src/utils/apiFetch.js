// Centralized authenticated fetch utility with automatic transparent token refresh
// Ensures the user stays permanently logged in without random session drops or 401 logouts

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Silently refresh access token using the stored refresh token
 */
export async function silentRefreshToken() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;

  try {
    const res = await fetch('/api/auth/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access) {
        localStorage.setItem('access_token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        return data.access;
      }
    }
  } catch (err) {
    console.warn('[silentRefreshToken] Network issue:', err.message);
  }
  return null;
}

/**
 * Enhanced fetch wrapper that attaches Bearer token and automatically
 * refreshes expired tokens on 401 responses, retrying the original request.
 */
export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  let token = localStorage.getItem('access_token');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // If 401 Unauthorized and we have a refresh token, silently refresh and retry
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await silentRefreshToken();
            isRefreshing = false;
            if (newToken) {
              processQueue(null, newToken);
              const retryHeaders = new Headers(options.headers || {});
              retryHeaders.set('Authorization', `Bearer ${newToken}`);
              return await fetch(url, { ...options, headers: retryHeaders });
            } else {
              processQueue(new Error('Refresh failed'), null);
            }
          } catch (refreshErr) {
            isRefreshing = false;
            processQueue(refreshErr, null);
          }
        } else {
          // Another request is already refreshing, wait for it then retry
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (newToken) => {
                const retryHeaders = new Headers(options.headers || {});
                retryHeaders.set('Authorization', `Bearer ${newToken}`);
                resolve(fetch(url, { ...options, headers: retryHeaders }));
              },
              reject: () => resolve(response),
            });
          });
        }
      }
    }

    return response;
  } catch (networkError) {
    throw networkError;
  }
}
