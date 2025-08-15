from datetime import datetime
from pydantic import BaseModel

class CrimePoint(BaseModel):
    lat: float
    lng: float
    crime_type: str
    date: datetime

class ClusterPoint(BaseModel):
    center_lat: float
    center_lng: float
    count: int
