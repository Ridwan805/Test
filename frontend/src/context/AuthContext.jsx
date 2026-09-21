import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me/', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            // Token might be expired
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (err) {
          console.error("Failed to fetch user profile", err);
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
      
      // Fetch profile
      const profileRes = await fetch('/api/auth/me/', {
        headers: {
          'Authorization': `Bearer ${data.access}`,
        },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData);
        return true;
      }
      return false;
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
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
};
