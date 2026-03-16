import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('ayucare_token'));

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('ayucare_token');
    if (storedToken) {
      try {
        const response = await authAPI.getMe();
        setUser(response.data);
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('ayucare_token');
        localStorage.removeItem('ayucare_user');
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('ayucare_token', access_token);
    localStorage.setItem('ayucare_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const register = async (name, email, password) => {
    const response = await authAPI.register({ name, email, password, role: 'dietitian' });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('ayucare_token', access_token);
    localStorage.setItem('ayucare_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('ayucare_token');
    localStorage.removeItem('ayucare_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
