import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Data source options - prioritize remote URL over local file
    DATA_URL: str = os.getenv("DATA_URL", "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=major-crime-indicators")
    DATA_PATH: str = os.getenv("DATA_PATH", "data/Major_Crime_Indicators_Open_Data_-3805566126367379926.csv")
    
    # Data processing settings
    DATE_COL: str = os.getenv("DATE_COL", "OCC_DATE")
    LAT_COL: str  = os.getenv("LAT_COL", "LAT_WGS84")
    LNG_COL: str  = os.getenv("LNG_COL", "LONG_WGS84")
    TYPE_COL: str = os.getenv("TYPE_COL", "MCI_CATEGORY")
    
    # CORS settings
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
