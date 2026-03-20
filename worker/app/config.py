from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    gtfs_rt_vehicle_url: str = "https://bustime.ttc.ca/gtfsrt/vehicles"
    gtfs_rt_trip_url: str = "https://bustime.ttc.ca/gtfsrt/trips"
    gtfs_rt_alert_url: str = "https://bustime.ttc.ca/gtfsrt/alerts"
    static_gtfs_url: str = "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/TTC%20Routes%20and%20Schedules%20Data.zip"
    poll_interval_seconds: int = 30
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ttc_transit"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
