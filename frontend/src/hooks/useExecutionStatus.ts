import { useState, useEffect, useRef, useCallback } from 'react';
import type { Execution } from '../types';
import { workflowService } from '../services/workflow.service';

interface UseExecutionStatusOptions {
  executionId: number;
  pollInterval?: number; // milliseconds
  onComplete?: (execution: Execution) => void;
  onError?: (error: Error) => void;
}

export const useExecutionStatus = (options: UseExecutionStatusOptions) => {
  const { executionId, pollInterval = 2000, onComplete, onError } = options;
  const [execution, setExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const fetchExecution = useCallback(async () => {
    if (!executionId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await workflowService.getExecution(executionId);
      setExecution(data);

      // Check if execution is complete
      if (data.status === 'success' || data.status === 'error') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (onCompleteRef.current) {
          onCompleteRef.current(data);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch execution status';
      setError(errorMessage);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!executionId) {
      stopPolling();
      return;
    }

    // Clean up previous interval
    stopPolling();

    // Initial fetch
    fetchExecution();

    // Set up polling
    intervalRef.current = setInterval(fetchExecution, pollInterval);

    return () => {
      stopPolling();
    };
  }, [executionId, pollInterval, fetchExecution, stopPolling]);

  const cancelExecution = useCallback(async () => {
    if (!executionId) return;
    try {
      await workflowService.cancelExecution(executionId);
      await fetchExecution(); // Refresh status
    } catch (err: any) {
      setError(err.message || 'Failed to cancel execution');
    }
  }, [executionId, fetchExecution]);

  return {
    execution,
    loading,
    error,
    refresh: fetchExecution,
    cancelExecution,
    stopPolling,
  };
};
