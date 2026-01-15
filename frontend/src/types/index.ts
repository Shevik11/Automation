// Auth types
export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Workflow types
export interface WorkflowConfig {
  id: number;
  user_id: number;
  workflow_name: string;
  n8n_workflow_id: string;
  webhook_path?: string;
  workflow_config_json?: Record<string, any>;
  workflow_version?: string;
  is_active: boolean;
  run_interval_minutes: number;
  last_run_at?: string;
  description?: string;
  source_file?: string;
  created_at: string;
}

export interface WorkflowConfigCreate {
  workflow_name: string;
  n8n_workflow_id: string;
  webhook_path?: string;
  workflow_config_json?: Record<string, any>;
  workflow_version?: string;
  is_active?: boolean;
  run_interval_minutes?: number;
  description?: string;
  source_file?: string;
}

export interface WorkflowJsonImport {
  workflow_json: Record<string, any>;
  source_file?: string;
}

export interface WorkflowFileImport {
  filename: string;
}

export interface WorkflowJsonExport {
  workflow_json: Record<string, any>;
}

// Preset types
export interface WorkflowPreset {
  id: number;
  user_id: number;
  workflow_config_id: number;
  preset_name: string;
  keywords: string; // JSON або текст
  location: string;
  created_at: string;
}

export interface WorkflowPresetCreate {
  workflow_config_id: number;
  preset_name: string;
  keywords: string;
  location: string;
}

// Execution types
export interface Execution {
  id: number;
  user_id: number;
  workflow_config_id: number;
  keywords: string; // JSON або текст
  location: string;
  n8n_execution_id: string | null;
  status: ExecutionStatus;
  result: Record<string, any> | null;
  created_at: string;
  completed_at: string | null;
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error';

export interface ExecutionCreate {
  workflow_config_id?: number; // Optional - will use default if not provided
  keywords: string;
  location: string;
  save_as_preset?: boolean; // Save parameters as preset after execution
  preset_name?: string; // Name for the preset if saving
}

// Linkedin results (business data rows) returned from /linkedin-results
export interface LinkedinResult {
  id: number;
  workflow_execution_id: number;
  vacancy_link: string;
  title: string;
}
