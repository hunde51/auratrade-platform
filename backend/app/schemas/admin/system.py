from pydantic import BaseModel, ConfigDict, Field


class AdminSystemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    api_status: str
    database_status: str
    redis_status: str
    websocket_connections: int = Field(ge=0)
    celery_worker_status: str


class BroadcastAlertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    message: str = Field(min_length=1, max_length=500)
