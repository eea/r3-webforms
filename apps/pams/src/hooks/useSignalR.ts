import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/hubs/workflow`;

export type SignalRStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export function useSignalR() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [status, setStatus] = useState<SignalRStatus>('disconnected');

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.onreconnecting(() => setStatus('reconnecting'));
    connection.onreconnected(() => setStatus('connected'));
    connection.onclose(() => setStatus('disconnected'));

    setStatus('connecting');
    connection.start()
      .then(() => setStatus('connected'))
      .catch(err => {
        console.error('[SignalR] Connection failed:', err);
        setStatus('disconnected');
      });

    return () => {
      connection.stop();
    };
  }, []);

  const sendHeartbeat = (datasetKey: string) => {
    connectionRef.current?.invoke('Heartbeat', datasetKey).catch(console.error);
  };

  return { connection: connectionRef.current, status, sendHeartbeat };
}
