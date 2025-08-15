from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Body
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from schemas.crime import CrimePoint, ClusterPoint
from services import data_loader
from services.clusters import kmeans_clusters
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
    start: Optional[str] = Query(None),
    end: Optional[str]   = Query(None),
    crime_type: Optional[str] = Query(None),
    bbox: Optional[str]  = Query(None),
    limit: int = Query(5000, ge=1, le=50000),
    offset: int = Query(0, ge=0)
):
    df = data_loader.filter_df(start, end, crime_type, bbox)
    return df.sort_values("date", ascending=False).iloc[offset:offset+limit].to_dict("records")

@router.get("/clusters", response_model=List[ClusterPoint])
def get_clusters(
    start: Optional[str] = None,
    end: Optional[str] = None,
    crime_type: Optional[str] = None,
    bbox: Optional[str] = None,
    k: int = Query(30, ge=1, le=500),
    max_points: int = Query(50_000, ge=100, le=200_000)
):
    df = data_loader.filter_df(start, end, crime_type, bbox)
    return kmeans_clusters(df, k=k, max_points=max_points)
