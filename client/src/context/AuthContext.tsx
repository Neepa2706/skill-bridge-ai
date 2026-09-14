import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, StudentProfile, UserRole } from '../types';

interface RegisterResponse {
  message: string;
  user: User;
  token: string;
  verificationToken?: string;
}

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  oauthError: string | null;
  clearOAuthError: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (data: any) => Promise<RegisterResponse>;
  registerStudent: (data: any) => Promise<RegisterResponse>;
  registerCollege: (data: any) => Promise<RegisterResponse>;
  registerRecruiter: (data: any) => Promise<RegisterResponse>;
  registerMentor: (data: any) => Promise<RegisterResponse>;
  verifyEmail: (verificationToken: string) => Promise<{ message: string; user: User }>;
  resendVerification: (email: string) => Promise<{ message: string; verificationToken?: string }>;
  forgotPassword: (email: string) => Promise<{ message: string; devToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sb_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const fetchCurrentUser = async (authToken: string): Promise<User | null> => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setProfile(data.profile);
        return data.user;
      } else {
        localStorage.removeItem('sb_token');
        setToken(null);
        setUser(null);
        setProfile(null);
        return null;
      }
    } catch (e) {
      console.error('Failed to load user:', e);
      localStorage.removeItem('sb_token');
      setToken(null);
      setUser(null);
      setProfile(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check for incoming OAuth parameters in URL query
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const errFromUrl = urlParams.get('oauth_error') || urlParams.get('error');

    if (errFromUrl) {
      setOauthError(decodeURIComponent(errFromUrl));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (tokenFromUrl) {
      localStorage.setItem('sb_token', tokenFromUrl);
      setToken(tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchCurrentUser(tokenFromUrl);
      return;
    }

    // 2. Validate existing token from localStorage
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      localStorage.setItem('sb_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchCurrentUser(data.token);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const executeRegistration = async (endpoint: string, formData: any): Promise<RegisterResponse> => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      if (data.token) {
        localStorage.setItem('sb_token', data.token);
        setToken(data.token);
        setUser(data.user);
      }

      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const registerStudent = (formData: any) => executeRegistration('/api/auth/register/student', formData);
  const registerCollege = (formData: any) => executeRegistration('/api/auth/register/college', formData);
  const registerRecruiter = (formData: any) => executeRegistration('/api/auth/register/recruiter', formData);
  const registerMentor = (formData: any) => executeRegistration('/api/auth/register/mentor', formData);

  const verifyEmail = async (verificationToken: string): Promise<{ message: string; user: User }> => {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Email verification failed.');
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const resendVerification = async (email: string): Promise<{ message: string; verificationToken?: string }> => {
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to resend verification.');
    }
    return data;
  };

  const forgotPassword = async (email: string): Promise<{ message: string; devToken?: string }> => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Password reset request failed.');
    }
    return data;
  };

  const resetPassword = async (resetToken: string, newPassword: string): Promise<{ message: string }> => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors during logout
    }
    localStorage.removeItem('sb_token');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const switchRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('sb_token', data.token);
        setToken(data.token);
        setUser(data.user);
        await fetchCurrentUser(data.token);
      }
    } catch (e) {
      console.error('Role switch failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (token) await fetchCurrentUser(token);
  };

  const clearOAuthError = () => setOauthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isAuthenticated: !!user,
        isLoading,
        oauthError,
        clearOAuthError,
        login,
        register: registerStudent,
        registerStudent,
        registerCollege,
        registerRecruiter,
        registerMentor,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        logout,
        switchRole,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
