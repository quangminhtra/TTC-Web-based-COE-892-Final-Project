from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TTC Transit API"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ttc_transit"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
