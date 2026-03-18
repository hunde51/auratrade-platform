from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AuraTrade API"
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]

    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "aura_ledger"

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_channel_market_prices: str = "market_prices"
    redis_channel_ticker_updates: str = "ticker_updates"
    redis_channel_alerts: str = "alerts"
    redis_channel_trades: str = "trades"
    redis_channel_wallets: str = "wallets"
    redis_channel_sentiment_updates: str = "sentiment_updates"

    market_cache_prefix: str = "market_prices"
    market_cache_ttl_seconds: int = 5
    market_poll_interval_seconds: int = 2
    market_default_symbols: list[str] = ["AAPL", "MSFT", "TSLA", "BTCUSD", "ETHUSD"]
    market_api_timeout_seconds: float = 5.0
    market_max_retries: int = 3
    market_retry_base_seconds: float = 0.5

    alpaca_poll_interval_seconds: int = 2
    polygon_poll_interval_seconds: int = 2
    alpha_vantage_poll_interval_seconds: int = 15

    alpaca_api_key: str | None = None
    alpaca_api_secret: str | None = None
    alpaca_base_url: str = "https://data.alpaca.markets"

    polygon_api_key: str | None = None
    polygon_base_url: str = "https://api.polygon.io"

    alpha_vantage_api_key: str | None = None
    alpha_vantage_base_url: str = "https://www.alphavantage.co"

    ai_provider: str = "gemini"
    ai_api_key: str | None = None
    ai_timeout_seconds: float = 8.0
    sentiment_cache_ttl_seconds: int = 45
    coach_cache_ttl_seconds: int = 60

    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    gemini_model: str = "gemini-1.5-flash"

    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    jwt_secret_key: str = Field(default="change-me-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    initial_paper_balance: float = 100000.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def database_url(self) -> str:
        encoded_password = quote_plus(self.postgres_password)
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{encoded_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def celery_broker_url(self) -> str:
        return self.redis_url

    @property
    def celery_result_backend(self) -> str:
        return self.redis_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
