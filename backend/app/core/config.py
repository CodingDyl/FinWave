from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, Field, field_validator
from typing import List, Union

class Settings(BaseSettings):
    app_env: str = Field(default="dev", alias="APP_ENV")
    env_name: str = Field(default="dev", alias="ENV_NAME")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")

    database_url: str = Field(default="postgresql://postgres:postgres@localhost:5432/fintech", alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")

    secret_key: str = Field(alias="SECRET_KEY")

    oauth_provider: str = Field(default="google", alias="OAUTH_PROVIDER")
    oauth_client_id: str = Field(alias="OAUTH_CLIENT_ID")
    oauth_client_secret: str = Field(alias="OAUTH_CLIENT_SECRET")
    oauth_redirect_uri: str = Field(alias="OAUTH_REDIRECT_URI")

    webhook_secret: str = Field(alias="WEBHOOK_SECRET")
    webhook_tolerance_seconds: int = Field(default=300, alias="WEBHOOK_TOLERANCE_SECONDS")
    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_webhook_secret: str | None = None
    stripe_connect_client_id: str | None = None
    stripe_connected_account_id: str | None = Field(default=None, alias="STRIPE_CONNECTED_ACCOUNT_ID")

    cors_origins: str = Field(default="", alias="CORS_ORIGINS")

    @field_validator('cors_origins', mode='after')
    @classmethod
    def parse_cors_origins(cls, v):
        if v and isinstance(v, str):
            return [url.strip() for url in v.split(',') if url.strip()]
        return []

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
