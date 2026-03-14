import api from './api';
import type { 
  WorkflowConfig, 
  WorkflowConfigCreate, 
  WorkflowPreset, 
  WorkflowPresetCreate, 
  Execution, 
  ExecutionCreate,
  WorkflowJsonExport,
  LinkedinResult,
} from '../types';

export const workflowService = {
  // Workflow Configs
  async getWorkflows(signal?: AbortSignal, limit = 50, offset = 0): Promise<WorkflowConfig[]> {
    const response = await api.get<WorkflowConfig[]>('/workflows', {
      signal,
      params: { limit, offset },
    });
    return response.data;
  },

  async getActiveWorkflows(limit = 50, offset = 0): Promise<WorkflowConfig[]> {
    const response = await api.get<WorkflowConfig[]>('/workflows/active', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getWorkflow(id: number): Promise<WorkflowConfig> {
    const response = await api.get<WorkflowConfig>(`/workflows/${id}`);
    return response.data;
  },

  async createWorkflow(data: WorkflowConfigCreate): Promise<WorkflowConfig> {
    const response = await api.post<WorkflowConfig>('/workflows', data);
    return response.data;
  },

  async updateWorkflowActiveStatus(id: number, isActive: boolean): Promise<WorkflowConfig> {
    const response = await api.patch<WorkflowConfig>(`/workflows/${id}/activate`, { is_active: isActive });
    return response.data;
  },

  async updateWorkflow(id: number, data: WorkflowConfigCreate): Promise<WorkflowConfig> {
    const response = await api.put<WorkflowConfig>(`/workflows/${id}`, data);
    return response.data;
  },

  async deleteWorkflow(id: number): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },

  async duplicateWorkflow(sourceId: number, workflowName: string): Promise<WorkflowConfig> {
    const response = await api.post<WorkflowConfig>(`/workflows/${sourceId}/duplicate`, { workflow_name: workflowName });
    return response.data;
  },

  // Presets
  async getPresets(limit = 50, offset = 0): Promise<WorkflowPreset[]> {
    const response = await api.get<WorkflowPreset[]>('/presets', {
      params: { limit, offset },
    });
    return response.data;
  },

  async createPreset(data: WorkflowPresetCreate): Promise<WorkflowPreset> {
    const response = await api.post<WorkflowPreset>('/presets', data);
    return response.data;
  },

  async deletePreset(id: number): Promise<void> {
    await api.delete(`/presets/${id}`);
  },

  // Executions
  async getExecutions(limit = 50, offset = 0): Promise<Execution[]> {
    const response = await api.get<Execution[]>('/executions', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getExecutionsByWorkflow(workflowConfigId: number, limit = 50, offset = 0): Promise<Execution[]> {
    const response = await api.get<Execution[]>('/executions', {
      params: { workflow_config_id: workflowConfigId, limit, offset },
    });
    return response.data;
  },

  async deactivateExecution(id: number): Promise<Execution> {
    const response = await api.post<Execution>(`/executions/${id}/deactivate`);
    return response.data;
  },

  async checkExecutionStatus(id: number): Promise<Execution> {
    const response = await api.post<Execution>(`/executions/${id}/check-status`);
    return response.data;
  },

  async checkRunningExecutions(): Promise<Execution[]> {
    const response = await api.post<Execution[]>('/executions/check-running');
    return response.data;
  },

  async downloadExecutionsCsv(): Promise<Blob> {
    const response = await api.get('/executions/export', {
      responseType: 'blob',
      params: { format: 'csv' },
    });
    return response.data;
  },

  async getLinkedinResults(limit = 50, offset = 0): Promise<LinkedinResult[]> {
    const response = await api.get<LinkedinResult[]>('/linkedin-results', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getExecution(id: number): Promise<Execution> {
    const response = await api.get<Execution>(`/executions/${id}`);
    return response.data;
  },

  async createExecution(data: ExecutionCreate): Promise<Execution> {
    const response = await api.post<Execution>('/executions', data);
    return response.data;
  },

  async cancelExecution(id: number): Promise<void> {
    await api.post(`/executions/${id}/cancel`);
  },

  // Default workflow
  async getDefaultWorkflow(): Promise<WorkflowConfig> {
    const response = await api.get<WorkflowConfig>('/workflows/default');
    return response.data;
  },

  // Workflow JSON operations
  async getWorkflowJson(id: number): Promise<Record<string, any>> {
    const response = await api.get<WorkflowJsonExport>(`/workflows/${id}/json`);
    return response.data.workflow_json;
  },

  async importWorkflowFromFile(filename: string = 'automation.json', signal?: AbortSignal): Promise<WorkflowConfig> {
    const response = await api.post<WorkflowConfig>('/workflows/import-file', { filename }, { signal });
    return response.data;
  },

  async initializeDefaultPresets(): Promise<{ message: string; count: number }> {
    const response = await api.post<{ message: string; count: number }>('/workflows/initialize-presets');
    return response.data;
  },
};
