import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.database import SessionLocal
from celery_app import celery_app
from models.execution import WorkflowExecution
from models.user import User
from models.workflow import WorkflowConfig
from schemas.execution import WorkflowExecutionCreate
from services.execution_service import ExecutionService
from services.n8n_service import N8NService

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


def get_db_session():
    return SessionLocal()


async def _trigger_workflow_on_n8n(workflow_config: WorkflowConfig, execution: WorkflowExecution, db):
    """
    Replicate the n8n trigger logic from the API endpoint:
    1. Create a fresh n8n workflow instance from the config JSON
    2. Move it to the configured folder
    3. Activate the instance
    4. Trigger it with parameters
    5. Store instance workflow id and execution id
    """
    n8n_svc = N8NService()

    # 1. Create a fresh n8n workflow instance with user_id baked in
    workflow_json = N8NService.inject_user_id_into_workflow(
        workflow_config.workflow_config_json, workflow_config.user_id
    )
    workflow_json = N8NService.replace_schedule_trigger_with_webhook(workflow_json)
    created = await n8n_svc.create_workflow_from_json(workflow_json)
    new_n8n_id = created.get("id")
    logger.info(
        f"Celery: Created n8n workflow instance {new_n8n_id} "
        f"for workflow_config {workflow_config.id}"
    )

    # 2. Move to configured folder if set
    if n8n_svc.folder_id and new_n8n_id:
        await n8n_svc.move_workflow_to_folder(new_n8n_id, n8n_svc.folder_id)

    # 3. Resolve the actual webhook path from the persisted n8n instance
    #    (n8n assigns a new webhookId on creation, so the template path is stale)
    persisted_wf = await n8n_svc.get_workflow(new_n8n_id)
    resolved_webhook_path = n8n_svc._extract_webhook_path_from_json(
        persisted_wf or workflow_json
    )

    # 4. Activate the new instance and wait for webhook registration
    await n8n_svc.activate_n8n_workflow(new_n8n_id)
    await n8n_svc._wait_for_workflow_active(new_n8n_id)

    # 5. Store instance workflow id
    execution.instance_n8n_workflow_id = new_n8n_id
    db.commit()

    # 6. Trigger the workflow
    if resolved_webhook_path:
        # Webhook-based workflow: trigger via webhook URL
        trigger_data = {
            "keywords": execution.keywords or "",
            "location": execution.location or "",
            "execution_id": execution.id,
            "user_id": workflow_config.user_id,
        }
        result = await n8n_svc.trigger_workflow(
            workflow_id=new_n8n_id,
            data=trigger_data,
            webhook_path=resolved_webhook_path,
        )
    else:
        # Schedule-based workflow: activation is the trigger,
        # n8n will execute it on its schedule.
        result = {}

    # 7. Update execution status
    execution.status = "running"
    if isinstance(result, dict) and result.get("executionId"):
        execution.n8n_execution_id = str(result["executionId"])
    db.commit()

    return new_n8n_id


@celery_app.task(name="tasks.check_and_trigger_n8n_workflows", bind=True)
def check_and_trigger_n8n_workflows(self):
    """
    Celery task that runs every 15 minutes (via beat schedule).
    Finds active workflows due for execution, creates n8n workflow instances,
    triggers them, and records executions in the DB.

    Logic:
    - Find all active workflows where last_run_at + run_interval_minutes <= now
    - For each: create n8n instance, activate, trigger, save execution
    - Workflows keep running every interval until deactivated (is_active=False)
    """
    db = None
    try:
        db = get_db_session()
        now = datetime.now(timezone.utc)

        all_active_workflows = (
            db.query(WorkflowConfig).filter(WorkflowConfig.is_active == True).all()
        )

        workflows_to_run = []
        for workflow in all_active_workflows:
            if workflow.last_run_at is None:
                workflows_to_run.append(workflow)
            else:
                next_run_time = workflow.last_run_at + timedelta(
                    minutes=workflow.run_interval_minutes
                )
                if next_run_time <= now:
                    workflows_to_run.append(workflow)

        count = len(workflows_to_run)

        if count == 0:
            logger.info("No active workflows found. Skipping execution")
            return {"status": "skipped", "reason": "no_active_workflows", "count": 0}

        logger.info(f"Found {count} active workflow(s) to process")

        results: List[Dict[str, Any]] = []

        for workflow in workflows_to_run:
            try:
                user = db.query(User).filter(User.id == workflow.user_id).first()
                if not user:
                    logger.warning(
                        f"User {workflow.user_id} not found for workflow {workflow.id}"
                    )
                    continue

                execution_data = WorkflowExecutionCreate(
                    workflow_config_id=workflow.id,
                    keywords="",
                    location="",
                    save_as_preset=False,
                    preset_name=None,
                )

                logger.info(
                    f"Celery: Triggering workflow {workflow.id} "
                    f"(n8n_id: {workflow.n8n_workflow_id}, webhook_path: {workflow.webhook_path or 'none'})"
                )

                try:
                    # Create execution record
                    execution = ExecutionService.create_execution(db, execution_data, user)

                    # Actually trigger the workflow on n8n
                    new_n8n_id = asyncio.run(
                        _trigger_workflow_on_n8n(workflow, execution, db)
                    )

                    # Update last_run_at
                    workflow.last_run_at = now
                    db.commit()

                    results.append(
                        {
                            "workflow_id": workflow.id,
                            "workflow_name": workflow.workflow_name,
                            "execution_id": execution.id,
                            "instance_n8n_workflow_id": new_n8n_id,
                            "status": "triggered",
                        }
                    )
                    logger.info(
                        f"Celery: Successfully triggered workflow {workflow.id} "
                        f"({workflow.workflow_name}), execution_id: {execution.id}, "
                        f"instance_n8n_id: {new_n8n_id}, "
                        f"next run in {workflow.run_interval_minutes} minutes"
                    )
                except Exception as exec_error:
                    logger.exception(
                        f"Failed to trigger workflow {workflow.id}: {str(exec_error)}"
                    )
                    results.append(
                        {
                            "workflow_id": workflow.id,
                            "workflow_name": workflow.workflow_name,
                            "status": "error",
                            "error": str(exec_error),
                        }
                    )

            except Exception as e:
                logger.exception(f"Failed to process workflow {workflow.id}: {str(e)}")
                results.append(
                    {
                        "workflow_id": workflow.id,
                        "workflow_name": getattr(workflow, "workflow_name", "unknown"),
                        "status": "error",
                        "error": str(e),
                    }
                )

        return {
            "status": "completed",
            "count": count,
            "processed": len(results),
            "results": results,
        }

    except Exception as e:
        logger.exception(f"Error in check_and_trigger_n8n_workflows: {str(e)}")
        return {"status": "error", "error": str(e)}
    finally:
        if db:
            db.close()
