from datetime import datetime
from typing import List, Dict, Any, Optional
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

class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: List[float]

class GeoJSONFeature(BaseModel):
    type: str
    geometry: GeoJSONGeometry
    properties: Dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str
    features: List[GeoJSONFeature]
    metadata: Optional[Dict[str, Any]] = None
