from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Body, Response
from fastapi.responses import JSONResponse
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from schemas.crime import CrimePoint, ClusterPoint, GeoJSONFeatureCollection
from services import data_loader
from services.clusters import kmeans_clusters
from services.geojson_utils import dataframe_to_geojson, clusters_to_geojson, add_cache_headers
from core.config import settings

router = APIRouter(prefix="", tags=["crimes"])

@router.get("/health")
def health():
    df = data_loader.ensure_loaded()
    return {"status": "ok", "rows": len(df)}

@router.post("/reload")
def reload_dataset(path: Optional[str] = Body(None, embed=True)):
    if path and not os.path.exists(path):
        raise HTTPException(400, f"Path not found: {path}")
    if path: 
        settings.DATA_PATH = path
    # force reload
    data_loader.DF = data_loader.load_dataset(settings.DATA_PATH)
    return {"loaded_rows": len(data_loader.DF), "path": settings.DATA_PATH}

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    os.makedirs("data", exist_ok=True)
    dst = os.path.join("data", file.filename)
    with open(dst, "wb") as f: f.write(await file.read())
    settings.DATA_PATH = dst
    data_loader.DF = data_loader.load_dataset(settings.DATA_PATH)
    return {"loaded_rows": len(data_loader.DF), "path": settings.DATA_PATH}

@router.get("/crimes", response_model=List[CrimePoint])
def get_crimes(
    response: Response,
    start: Optional[str] = Query(None),
    end: Optional[str]   = Query(None),
    crime_type: Optional[str] = Query(None),
    bbox: Optional[str]  = Query(None, description="Bounding box as 'min_lng,min_lat,max_lng,max_lat'"),
    limit: int = Query(5000, ge=1, le=50000),
    offset: int = Query(0, ge=0)
):
    # Add caching headers for map performance
    add_cache_headers(response, "api", 300)
    response.headers["ETag"] = f'"crimes-{hash((start, end, crime_type, bbox, limit, offset))}"'
    
    df = data_loader.filter_df(start, end, crime_type, bbox)
    return df.sort_values("date", ascending=False).iloc[offset:offset+limit].to_dict("records")

@router.get("/crimes/geojson", response_model=GeoJSONFeatureCollection)
def get_crimes_geojson(
    response: Response,
    start: Optional[str] = Query(None),
    end: Optional[str]   = Query(None),
    crime_type: Optional[str] = Query(None),
    bbox: Optional[str]  = Query(None, description="Bounding box as 'min_lng,min_lat,max_lng,max_lat'"),
    limit: int = Query(5000, ge=1, le=50000),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """Return crime data in GeoJSON format for better map integration"""
    # Add caching headers for map performance
    add_cache_headers(response, "geojson", 300)
    response.headers["ETag"] = f'"crimes-geojson-{hash((start, end, crime_type, bbox, limit, offset))}"'
    
    df = data_loader.filter_df(start, end, crime_type, bbox)
    crimes_data = df.sort_values("date", ascending=False).iloc[offset:offset+limit]
    
    geojson = dataframe_to_geojson(crimes_data)
    geojson["metadata"] = {
        "total_features": len(geojson["features"]),
        "bbox_used": bbox,
        "filters_applied": {
            "start": start,
            "end": end,
            "crime_type": crime_type
        }
    }
    
    return geojson

@router.get("/clusters", response_model=List[ClusterPoint])
def get_clusters(
    response: Response,
    start: Optional[str] = None,
    end: Optional[str] = None,
    crime_type: Optional[str] = None,
    bbox: Optional[str] = Query(None, description="Bounding box as 'min_lng,min_lat,max_lng,max_lat'"),
    k: int = Query(30, ge=1, le=500),
    max_points: int = Query(50_000, ge=100, le=200_000)
):
    # Add caching headers for map performance
    add_cache_headers(response, "api", 600)
    response.headers["ETag"] = f'"clusters-{hash((start, end, crime_type, bbox, k, max_points))}"'
    
    df = data_loader.filter_df(start, end, crime_type, bbox)
    return kmeans_clusters(df, k=k, max_points=max_points)

@router.get("/clusters/geojson", response_model=GeoJSONFeatureCollection)
def get_clusters_geojson(
    response: Response,
    start: Optional[str] = None,
    end: Optional[str] = None,
    crime_type: Optional[str] = None,
    bbox: Optional[str] = Query(None, description="Bounding box as 'min_lng,min_lat,max_lng,max_lat'"),
    k: int = Query(30, ge=1, le=500),
    max_points: int = Query(50_000, ge=100, le=200_000)
) -> Dict[str, Any]:
    """Return cluster data in GeoJSON format for better map integration"""
    # Add caching headers for map performance
    add_cache_headers(response, "geojson", 600)
    response.headers["ETag"] = f'"clusters-geojson-{hash((start, end, crime_type, bbox, k, max_points))}"'
    
    df = data_loader.filter_df(start, end, crime_type, bbox)
    clusters_data = kmeans_clusters(df, k=k, max_points=max_points)
    
    geojson = clusters_to_geojson(clusters_data)
    geojson["metadata"] = {
        "total_clusters": len(geojson["features"]),
        "k_value": k,
        "bbox_used": bbox,
        "filters_applied": {
            "start": start,
            "end": end,
            "crime_type": crime_type
        }
    }
    
    return geojson
