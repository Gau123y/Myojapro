import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (mob: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('oja_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (mob: string, pass: string) => {
    // Hardcoded Admin
    if (mob === '111' && pass === '111') {
      const admin: User = { id: 'admin', name: 'Super Admin', mob, role: UserRole.ADMIN };
      setCurrentUser(admin);
      sessionStorage.setItem('oja_user', JSON.stringify(admin));
      return true;
    }

    // Hardcoded Driver
    if (mob === '999' && pass === 'driver') {
      const driver: User = { id: 'driver', name: 'Main Driver', mob, role: UserRole.DRIVER };
      setCurrentUser(driver);
      sessionStorage.setItem('oja_user', JSON.stringify(driver));
      return true;
    }

    // Check against stored users (Simulating DB check)
    const storedUsersStr = localStorage.getItem('oja_users');
    if (storedUsersStr) {
      const users: User[] = JSON.parse(storedUsersStr);
      const user = users.find(u => u.mob === mob && u.pass === pass);
      if (user) {
        setCurrentUser(user);
        sessionStorage.setItem('oja_user', JSON.stringify(user));
        return true;
      }
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('oja_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
