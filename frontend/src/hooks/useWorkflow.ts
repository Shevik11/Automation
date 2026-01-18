import { useState, useEffect } from 'react';
import type { WorkflowConfig, WorkflowConfigCreate } from '../types';
import { workflowService } from '../services/workflow.service';

export const useWorkflow = () => {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async (data: WorkflowConfigCreate): Promise<WorkflowConfig | null> => {
    setLoading(true);
    setError(null);
    try {
      const newWorkflow = await workflowService.createWorkflow(data);
      setWorkflows([...workflows, newWorkflow]);
      return newWorkflow;
    } catch (err: any) {
      setError(err.message || 'Failed to create workflow');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return {
    workflows,
    loading,
    error,
    fetchWorkflows,
    createWorkflow,
  };
};
