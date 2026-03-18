from pydantic import BaseModel, ConfigDict, Field


class AdminTimeSeriesPoint(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    label: str
    value: int = Field(ge=0)
