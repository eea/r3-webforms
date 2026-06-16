import { useEffect, useRef, useState } from 'react';
import { useSignalR } from '../contexts/SignalRContext';

export type WorkflowStatus = 'idle' | 'running' | 'done' | 'error';

export type ProgressState = {
  status: WorkflowStatus;
  step: string;
  message: string;
  percent: number;
  result: unknown;
  error: string | null;
};

const INITIAL: ProgressState = {
  status: 'idle',
  step: '',
  message: '',
  percent: 0,
  result: null,
  error: null,
};

/**
 * Subscribes to SignalR workflow events for a specific step
 * (e.g. 'pull', 'push', 'validation').
 */
export function useWorkflowProgress(step: string) {
  const { connection } = useSignalR();
  const [state, setState] = useState<ProgressState>(INITIAL);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!connection) return;

    const onProgress = (s: string, message: string, percent: number) => {
      if (s !== stepRef.current) return;
      setState(prev => ({ ...prev, status: 'running', step: s, message, percent }));
    };

    const onComplete = (s: string, result: unknown) => {
      if (s !== stepRef.current) return;
      setState({ status: 'done', step: s, message: 'Complete', percent: 100, result, error: null });
    };

    const onError = (s: string, error: string) => {
      if (s !== stepRef.current) return;
      setState(prev => ({ ...prev, status: 'error', step: s, error, percent: 0 }));
    };

    connection.on('ProgressUpdate', onProgress);
    connection.on('WorkflowComplete', onComplete);
    connection.on('WorkflowError', onError);

    return () => {
      connection.off('ProgressUpdate', onProgress);
      connection.off('WorkflowComplete', onComplete);
      connection.off('WorkflowError', onError);
    };
  }, [connection]);

  const reset = () => setState(INITIAL);

  return { ...state, reset };
}
