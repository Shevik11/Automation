### Workflow Automation & n8n Integration

This platform integrates with **n8n** to perform complex, multi-step automation tasks that are triggered and managed via the FastAPI backend.

#### Integration Logic
- **Trigger**: Workflows are triggered via HTTP webhooks provided by n8n.
- **Workflow ID**: Each `WorkflowConfig` in the database stores the `n8n_workflow_id`.
- **Webhook Path**: The endpoint path to trigger the specific workflow.
- **Payload**: When triggered, the backend sends a JSON payload (e.g., keywords, location) to the n8n webhook.
- **Results**: n8n workflows are expected to push results back to the backend's API (e.g., `/api/linkedin-results`).

#### Scheduling (Celery Beat)
- **Automatic Triggering**: A Celery worker monitors all active `WorkflowConfig` entries.
- **Interval**: Workflows have a `run_interval_minutes` property.
- **Scheduler**: `celery_app.conf.beat_schedule` in `backend/celery_app.py` is configured to run the `check_and_trigger_n8n_workflows` task every 15 minutes.
- **Logic**: For each active workflow, the task checks if `now >= last_run_at + run_interval_minutes`. If so, it triggers the workflow.

#### Execution Tracking
- Every trigger (manual or automated) creates a `WorkflowExecution` record.
- Statuses include: `pending`, `running`, `success`, `error`.
- Logs and error messages are captured in the execution record for debugging.

#### Environment Variables
- `N8N_API_URL`: The base URL for the n8n API.
- `N8N_API_KEY`: Authentication key for n8n.
- `N8N_WEBHOOK_URL`: The URL where n8n should send results back to the backend.
