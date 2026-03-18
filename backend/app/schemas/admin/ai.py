from pydantic import BaseModel, ConfigDict, Field


class AdminAIUsageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    total_requests: int = Field(ge=0)
    success_count: int = Field(ge=0)
    failure_count: int = Field(ge=0)
    fallback_count: int = Field(ge=0)
