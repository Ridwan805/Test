import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to sync user state with localStorage for JupyterLite and global permissions
  const syncUserState = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user_is_staff', Boolean(userData.is_staff).toString());
      localStorage.setItem('user_email', userData.email || '');
      localStorage.setItem('cached_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user_is_staff');
      localStorage.removeItem('user_email');
      localStorage.removeItem('cached_user');
    }
  };

  // Helper to silently refresh expired access token using refresh token
  const tryRefreshToken = async () => {
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
    } catch (e) {
      // Network/offline error — preserve current session
    }
    return null;
  };

  // Verify and sync user profile on mount without auto-logging out on network errors
  useEffect(() => {
    const fetchProfile = async () => {
      let token = localStorage.getItem('access_token');
      if (token) {
        try {
          let res = await fetch('/api/auth/me/', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          // If token returned 401, attempt silent background refresh
          if (res.status === 401) {
            const newToken = await tryRefreshToken();
            if (newToken) {
              token = newToken;
              res = await fetch('/api/auth/me/', {
                headers: {
                  'Authorization': `Bearer ${newToken}`,
                },
              });
            }
          }

          if (res.ok) {
            const data = await res.json();
            if (data.access) localStorage.setItem('access_token', data.access);
            if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
            syncUserState(data);
          } else {
            console.warn("Auth sync responded with status:", res.status, "- maintaining persistent user session.");
          }
        } catch (err) {
          // Network error or server restarting — KEEP the user logged in using cached state!
          console.warn("Network hiccup during profile sync, retaining persistent session:", err.message);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid email or password');
      }

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      
      if (data.user) {
        syncUserState(data.user);
        return true;
      }

      // Fallback: Fetch profile
      const profileRes = await fetch('/api/auth/me/', {
        headers: {
          'Authorization': `Bearer ${data.access}`,
        },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        syncUserState(profileData);
        return true;
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const signup = async (firstName, lastName, email, password) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle field validation errors
        let errorMsg = 'Failed to sign up';
        if (data.email) {
          errorMsg = `Email: ${data.email[0]}`;
        } else if (data.password) {
          errorMsg = `Password: ${data.password[0]}`;
        } else if (data.non_field_errors) {
          errorMsg = data.non_field_errors[0];
        } else if (data.first_name) {
          errorMsg = `First Name: ${data.first_name[0]}`;
        } else if (data.last_name) {
          errorMsg = `Last Name: ${data.last_name[0]}`;
        }
        throw new Error(errorMsg);
      }

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      syncUserState(data.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    syncUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
};
