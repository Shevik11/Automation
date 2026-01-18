import os

from celery import Celery

# Get broker URL from environment or use default
broker_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
backend_url = os.getenv("CELERY_RESULT_BACKEND", broker_url)

celery_app = Celery("automation", broker=broker_url, backend=backend_url)

# Celery configuration
celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    imports=["tasks"],
)

# Beat schedule - run every 15 minutes
celery_app.conf.beat_schedule = {
    "check-and-trigger-n8n-every-15-min": {
        "task": "tasks.check_and_trigger_n8n_workflows",
        "schedule": 15 * 60.0,  # 15 minutes in seconds
    },
}

# Import tasks module to register them with celery
try:
    from tasks import check_and_trigger_n8n_workflows
except ImportError:
    pass  # Tasks will be registered when imported by worker
