from fastapi import APIRouter, HTTPException, Depends
from fastapi import status
from sqlalchemy.orm import Session
from app.database import get_db
from api.auth import get_current_user
from models.user import User
import redis
import os
import logging

router = APIRouter()


@router.get("/celery/status")
async def check_celery_status(
    current_user: User = Depends(get_current_user)
):
    """
    Check Celery worker and Redis connection status
    """
    try:
        # Check Redis connection
        redis_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
        redis_client = redis.from_url(redis_url)
        redis_client.ping()
        redis_status = "connected"
    except Exception as e:
        redis_status = "connection_failed"
        # Log the actual error for debugging but don't expose it
        logger = logging.getLogger(__name__)
        logger.error(f"Redis connection failed: {str(e)}")
    
    try:
        # Check if Celery worker is registered
        from celery_app import celery_app
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        registered_workers = inspect.registered()
        
        if active_workers:
            worker_status = "active"
            worker_count = len(active_workers)
        else:
            worker_status = "no_active_workers"
            worker_count = 0
            
    except Exception as e:
        worker_status = "connection_failed"
        worker_count = 0
        active_workers = None
        registered_workers = None
        # Log the actual error for debugging but don't expose it
        logger = logging.getLogger(__name__)
        logger.error(f"Celery worker check failed: {str(e)}")
    
    return {
        "redis": {
            "status": redis_status
        },
        "celery_worker": {
            "status": worker_status,
            "worker_count": worker_count,
            "active_workers": list(active_workers.keys()) if active_workers else [],
            "registered_tasks": list(registered_workers.values())[0] if registered_workers else []
        }
    }


@router.get("/celery/tasks")
async def get_celery_tasks(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of active and scheduled Celery tasks
    """
    try:
        from celery_app import celery_app
        inspect = celery_app.control.inspect()
        
        active_tasks = inspect.active()
        scheduled_tasks = inspect.scheduled()
        reserved_tasks = inspect.reserved()
        
        return {
            "active": active_tasks or {},
            "scheduled": scheduled_tasks or {},
            "reserved": reserved_tasks or {}
        }
    except Exception as e:
        # Log the actual error for debugging but don't expose it in the API response
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to get Celery tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve Celery task information"
        )

