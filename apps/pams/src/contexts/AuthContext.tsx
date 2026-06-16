import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type User = { username: string; email: string };

type AuthContextType = {
  user: User | null;
  isConnected: boolean;
  dataflowId: string;
  datasetId: string;
  setDataflowId: (v: string) => void;
  setDatasetId: (v: string) => void;
  login: (username: string, password: string, dataflowId: string, datasetId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isConnected: false,
  dataflowId: '',
  datasetId: '',
  setDataflowId: () => {},
  setDatasetId: () => {},
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dataflowId, setDataflowId] = useState(() => localStorage.getItem('rn3_dataflowid') ?? '');
  const [datasetId, setDatasetId] = useState(() => localStorage.getItem('rn3_datasetid') ?? '');

  // On mount, check if we have an active session
  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((data: User | null) => {
        if (data?.username) setUser(data);
      })
      .catch(() => {});
  }, []);

  const login = async (username: string, password: string, dataflowId: string, datasetId: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Login failed');
    }
    const data: User = await res.json();
    setUser(data);
    setDataflowId(dataflowId);
    setDatasetId(datasetId);
    localStorage.setItem('rn3_dataflowid', dataflowId);
    localStorage.setItem('rn3_datasetid', datasetId);
  };

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isConnected: !!user,
      dataflowId,
      datasetId,
      setDataflowId,
      setDatasetId,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
