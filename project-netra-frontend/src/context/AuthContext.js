// src/context/AuthContext.js (Corrected and Final)
"use client";
import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { apiLogin } from '../services/api';
import BackgroundScheduler from '../components/BackgroundScheduler';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentLecture, setCurrentLecture] = useState(null);
  
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
        try {
            const decoded = jwtDecode(storedToken);
            if (decoded.exp * 1000 < Date.now()) {
                logout();
            } else {
                const storedUser = localStorage.getItem('user');
                setUser(storedUser ? JSON.parse(storedUser) : null);
                setToken(storedToken);
            }
        } catch (e) {
            logout();
        }
    }
    setLoading(false);
  }, [logout]);
  
  useEffect(() => {
    if (!loading) {
      const isAuthenticated = !!token && !!user;
      const isAuthPage = pathname === '/login';
      if (!isAuthenticated && !isAuthPage) {
        router.push('/login');
      } else if (isAuthenticated && isAuthPage) {
        router.push('/attendance');
      }
    }
  }, [loading, user, token, pathname, router]);

  const login = async (username, password) => {
    const data = await apiLogin(username, password);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.access_token);
    router.push('/attendance');
  };
  
  const refreshSession = (newUser, newToken) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    setToken(newToken);
    // No router push needed, user is already on the page
  };

  if (loading) {
    return <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Authenticating...</div>;
  }
  
  const contextValue = {
      user,
      token,
      login, // For the login page
      logout,
      refreshSession, // For the profile page
      isAuthenticated: !!user && !!token,
      isVerifying,
      setIsVerifying,
      currentLecture,
      setCurrentLecture,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <BackgroundScheduler />
      {children}
    </AuthContext.Provider>
  );
};