from app.core.config import settings
from fastapi import FastAPI


app = FastAPI(title=settings.app_name)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "AuraTrade backend running"}