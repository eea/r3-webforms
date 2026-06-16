import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';

const HUB_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/hubs/workflow`;

export type SignalRStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type SignalRContextType = {
  connection: signalR.HubConnection | null;
  status: SignalRStatus;
  sendHeartbeat: (datasetKey: string) => void;
};

const SignalRContext = createContext<SignalRContextType>({
  connection: null,
  status: 'disconnected',
  sendHeartbeat: () => {},
});

export function SignalRProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useAuth();
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [status, setStatus] = useState<SignalRStatus>('disconnected');
  const connRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!isConnected) {
      // Disconnect if user logs out
      connRef.current?.stop();
      connRef.current = null;
      setConnection(null);
      setStatus('disconnected');
      return;
    }

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connRef.current = conn;

    conn.onreconnecting(() => setStatus('reconnecting'));
    conn.onreconnected(() => setStatus('connected'));
    conn.onclose(() => setStatus('disconnected'));

    setStatus('connecting');
    conn.start()
      .then(() => {
        setStatus('connected');
        setConnection(conn);
      })
      .catch(err => {
        console.error('[SignalR] Connection failed:', err);
        setStatus('disconnected');
      });

    return () => {
      conn.stop();
      connRef.current = null;
      setConnection(null);
      setStatus('disconnected');
    };
  }, [isConnected]);

  const sendHeartbeat = (datasetKey: string) => {
    connRef.current?.invoke('Heartbeat', datasetKey).catch(console.error);
  };

  return (
    <SignalRContext.Provider value={{ connection, status, sendHeartbeat }}>
      {children}
    </SignalRContext.Provider>
  );
}

export function useSignalR() {
  return useContext(SignalRContext);
}
