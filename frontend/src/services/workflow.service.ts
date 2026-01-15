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
  async getWorkflows(): Promise<WorkflowConfig[]> {
    const response = await api.get<WorkflowConfig[]>('/workflows');
    return response.data;
  },

  async getActiveWorkflows(): Promise<WorkflowConfig[]> {
    const response = await api.get<WorkflowConfig[]>('/workflows/active');
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

  // Presets
  async getPresets(): Promise<WorkflowPreset[]> {
    const response = await api.get<WorkflowPreset[]>('/workflows/presets');
    return response.data;
  },

  async createPreset(data: WorkflowPresetCreate): Promise<WorkflowPreset> {
    const response = await api.post<WorkflowPreset>('/workflows/presets', data);
    return response.data;
  },

  async deletePreset(id: number): Promise<void> {
    await api.delete(`/workflows/presets/${id}`);
  },

  // Executions
  async getExecutions(): Promise<Execution[]> {
    const response = await api.get<Execution[]>('/executions');
    return response.data;
  },

  async downloadExecutionsCsv(): Promise<Blob> {
    const response = await api.get('/executions/export', {
      responseType: 'blob',
      params: { format: 'csv' },
    });
    return response.data;
  },

  async getLinkedinResults(): Promise<LinkedinResult[]> {
    const response = await api.get<LinkedinResult[]>('/linkedin-results');
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

  async importWorkflowFromFile(filename: string = 'automation.json'): Promise<WorkflowConfig> {
    const response = await api.post<WorkflowConfig>('/workflows/import-file', { filename });
    return response.data;
  },

  async initializeDefaultPresets(): Promise<{ message: string; count: number }> {
    const response = await api.post<{ message: string; count: number }>('/workflows/initialize-presets');
    return response.data;
  },
};
