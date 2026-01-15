-- ============================================================================
-- TABLE CREATION SCRIPT FOR AUTOMATION PLATFORM
-- ============================================================================
-- This script creates all necessary tables for the Automation Platform.
-- Tables are created in order of dependencies to avoid foreign key issues.
-- ============================================================================

-- 1. USERS TABLE
-- Stores user account information and authentication details
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

-- 2. WORKFLOW_CONFIGS TABLE
-- Stores workflow configuration and n8n integration details
CREATE TABLE IF NOT EXISTS workflow_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_name VARCHAR(255) NOT NULL,
    n8n_workflow_id VARCHAR(255) NOT NULL UNIQUE,
    webhook_path VARCHAR(255),
    workflow_config_json JSON,
    workflow_version VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    run_interval_minutes INTEGER DEFAULT 15 NOT NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    source_file VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_workflow_configs_user_id ON workflow_configs(user_id);
CREATE INDEX IF NOT EXISTS ix_workflow_configs_n8n_workflow_id ON workflow_configs(n8n_workflow_id);

-- 3. GOOGLE_AUTH TABLE
-- Stores Google OAuth tokens and spreadsheet information per user
CREATE TABLE IF NOT EXISTS google_auth (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    spreadsheet_id VARCHAR(255),
    spreadsheet_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_google_auth_user_id ON google_auth(user_id);

-- 4. WORKFLOW_EXECUTIONS TABLE
-- Records each execution of a workflow
CREATE TABLE IF NOT EXISTS workflow_executions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_config_id INTEGER NOT NULL REFERENCES workflow_configs(id) ON DELETE CASCADE,
    keywords TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    n8n_execution_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS ix_workflow_executions_workflow_config_id ON workflow_executions(workflow_config_id);
CREATE INDEX IF NOT EXISTS ix_workflow_executions_n8n_execution_id ON workflow_executions(n8n_execution_id);

-- 5. SAVED_PRESETS TABLE
-- Stores saved workflow presets for quick reuse
CREATE TABLE IF NOT EXISTS saved_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_config_id INTEGER NOT NULL REFERENCES workflow_configs(id) ON DELETE CASCADE,
    preset_name VARCHAR(255) NOT NULL,
    keywords VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_saved_presets_user_id ON saved_presets(user_id);
CREATE INDEX IF NOT EXISTS ix_saved_presets_workflow_config_id ON saved_presets(workflow_config_id);

-- 6. LINKEDIN_RESULTS TABLE
-- Stores LinkedIn search results from workflow executions
CREATE TABLE IF NOT EXISTS linkedin_results (
    id SERIAL PRIMARY KEY,
    workflow_execution_id INTEGER NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    vacancy_link TEXT UNIQUE,
    title VARCHAR(255),
    company_name VARCHAR(255),
    company_linkedin_page TEXT,
    detail TEXT,
    source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hiring_manager_name VARCHAR(255),
    hiring_manager_position VARCHAR(255),
    hiring_manager_url TEXT,
    company_page_url TEXT
);

CREATE INDEX IF NOT EXISTS ix_linkedin_results_workflow_execution_id ON linkedin_results(workflow_execution_id);
