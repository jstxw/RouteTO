import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATA_PATH: str = os.getenv("DATA_PATH", "data/Major_Crime_Indicators_Open_Data_-3805566126367379926.csv")
    DATE_COL: str = os.getenv("DATE_COL", "OCC_DATE")
    LAT_COL: str  = os.getenv("LAT_COL", "LAT_WGS84")
    LNG_COL: str  = os.getenv("LNG_COL", "LONG_WGS84")
    TYPE_COL: str = os.getenv("TYPE_COL", "MCI_CATEGORY")
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
