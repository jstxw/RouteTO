import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATA_PATH: str = os.getenv("DATA_PATH", "data/incidents.csv")
    DATE_COL: str = os.getenv("DATE_COL", "date")
    LAT_COL: str  = os.getenv("LAT_COL", "lat")
    LNG_COL: str  = os.getenv("LNG_COL", "lng")
    TYPE_COL: str = os.getenv("TYPE_COL", "crime_type")
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
