from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "auratrade",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.worker"],
)

celery_app.conf.task_default_queue = "default"
