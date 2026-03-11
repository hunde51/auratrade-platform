from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "auratrade",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.worker"],
)

celery_app.conf.task_default_queue = "default"
