import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from celery_app import celery_app
from app.database import SessionLocal
from models.workflow import WorkflowConfig
from models.execution import WorkflowExecution
from models.user import User
from services.execution_service import create_execution
from schemas.execution import WorkflowExecutionCreate

# Configure logging for celery tasks
logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)


def get_db_session():
    """Get database session"""
    return SessionLocal()


@celery_app.task(name="tasks.check_and_trigger_n8n_workflows", bind=True)
def check_and_trigger_n8n_workflows(self):
    """
    Celery task that runs every 15 minutes.
    Checks for workflows that need to be triggered and executes them.
    
    Logic:
    - If 0 workflows: do nothing
    - If 1 workflow: trigger it
    - If >1 workflows: process in loop
    - All results saved to DB via create_execution
    """
    db = None
    try:
        db = get_db_session()
        now = datetime.utcnow()
        
        # Find all active workflows that need to run
        # A workflow needs to run if:
        # 1. It's active
        # 2. last_run_at is None (never run) OR last_run_at + run_interval_minutes <= now
        all_active_workflows = db.query(WorkflowConfig).filter(
            WorkflowConfig.is_active == True
        ).all()
        
        workflows_to_run = []
        for workflow in all_active_workflows:
            if workflow.last_run_at is None:
                # Never run before - add to list
                workflows_to_run.append(workflow)
            else:
                # Check if interval has passed
                next_run_time = workflow.last_run_at + timedelta(minutes=workflow.run_interval_minutes)
                if next_run_time <= now:
                    workflows_to_run.append(workflow)
        
        count = len(workflows_to_run)
        
        if count == 0:
            logger.info("No active workflows found. Skipping execution.")
            return {"status": "skipped", "reason": "no_active_workflows", "count": 0}
        
        logger.info(f"Found {count} active workflow(s) to process")
        
        results: List[Dict[str, Any]] = []
        
        # Process workflows (works for 1 or multiple)
        for workflow in workflows_to_run:
            try:
                # Get user for this workflow
                user = db.query(User).filter(User.id == workflow.user_id).first()
                if not user:
                    logger.warning(f"User {workflow.user_id} not found for workflow {workflow.id}")
                    continue
                
                # Create execution data
                execution_data = WorkflowExecutionCreate(
                    workflow_config_id=workflow.id,
                    keywords="",  # Can be customized per workflow or from presets
                    location="",  # Can be customized per workflow or from presets
                    save_as_preset=False,
                    preset_name=None,
                )
                
                # Trigger execution asynchronously
                logger.info(
                    f"Celery: Triggering workflow {workflow.id} "
                    f"(n8n_id: {workflow.n8n_workflow_id}, webhook_path: {workflow.webhook_path or 'none'})"
                )
                
                # Run async function in sync context using asyncio.run()
                # asyncio.run() properly manages event loop lifecycle (Python 3.10+ compatible)
                try:
                    execution = asyncio.run(
                        create_execution(db, user, execution_data)
                    )
                    
                    # Update last_run_at after successful execution
                    workflow.last_run_at = now
                    db.commit()
                    
                    results.append({
                        "workflow_id": workflow.id,
                        "workflow_name": workflow.workflow_name,
                        "execution_id": execution.id,
                        "status": "success"
                    })
                    logger.info(
                        f"Celery: Successfully triggered workflow {workflow.id} "
                        f"({workflow.workflow_name}), execution_id: {execution.id}, "
                        f"next run in {workflow.run_interval_minutes} minutes"
                    )
                except Exception as exec_error:
                    logger.exception(f"Failed to create execution for workflow {workflow.id}: {str(exec_error)}")
                    results.append({
                        "workflow_id": workflow.id,
                        "workflow_name": workflow.workflow_name,
                        "status": "error",
                        "error": str(exec_error)
                    })
                    
            except Exception as e:
                logger.exception(f"Failed to process workflow {workflow.id}: {str(e)}")
                results.append({
                    "workflow_id": workflow.id,
                    "workflow_name": getattr(workflow, 'workflow_name', 'unknown'),
                    "status": "error",
                    "error": str(e)
                })
        
        return {
            "status": "completed",
            "count": count,
            "processed": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.exception(f"Error in check_and_trigger_n8n_workflows: {str(e)}")
        return {"status": "error", "error": str(e)}
    finally:
        if db:
            db.close()

