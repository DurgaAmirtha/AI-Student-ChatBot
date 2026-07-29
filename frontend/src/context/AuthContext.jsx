import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, tokenService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(tokenService.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = tokenService.getToken();
      if (token) {
        try {
          const userData = await apiRequest('/auth/me');
          setUser(userData);
          tokenService.setUser(userData);
        } catch (err) {
          console.warn('Auth check failed:', err);
          tokenService.removeToken();
          tokenService.removeUser();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    tokenService.setToken(res.access_token);
    tokenService.setUser(res.user);
    setUser(res.user);
    return res.user;
  };

  const signup = async (email, fullName, password, confirmPassword) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        full_name: fullName,
        password,
        confirm_password: confirmPassword,
      }),
    });
    tokenService.setToken(res.access_token);
    tokenService.setUser(res.user);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    tokenService.removeToken();
    tokenService.removeUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
