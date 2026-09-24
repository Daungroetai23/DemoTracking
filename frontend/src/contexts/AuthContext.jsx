import { createContext, useContext, useState, useEffect } from 'react';
import api, { setToken, removeToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('demotrack_user');
    const savedToken = localStorage.getItem('demotrack_token');

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      api.get('/auth/me')
        .then((data) => {
          setUser(data);
          localStorage.setItem('demotrack_user', JSON.stringify(data));
        })
        .catch(() => {
          // Token invalid — clear
          setUser(null);
          removeToken();
          localStorage.removeItem('demotrack_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('demotrack_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    removeToken();
    localStorage.removeItem('demotrack_user');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updatedData };
      localStorage.setItem('demotrack_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
