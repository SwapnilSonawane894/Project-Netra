// src/context/AuthContext.js (Final Version)
"use client";
import { createContext, useState, useEffect, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { login as apiLogin } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded = jwtDecode(token);
            // You can add token expiration check here
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
        } catch (e) {
            console.error("Invalid token");
            localStorage.clear();
        }
    }
    setLoading(false);
  }, []);
  
  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login';
      const userExists = !!user;
      if (!userExists && !isAuthPage) {
        router.push('/login');
      } else if (userExists && isAuthPage) {
        router.push('/');
      }
    }
  }, [loading, user, pathname, router]);

  const login = async (username, password) => {
    const data = await apiLogin(username, password);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    router.push('/');
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    router.push('/login');
  };
  
  if (loading) return <div>Loading Application...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};