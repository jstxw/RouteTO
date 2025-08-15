import os, pandas as pd
from typing import List
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from core.config import settings

DF = None  # cached dataframe

def _infer_column(df: pd.DataFrame, preferred: str, alts: List[str]) -> str:
    if preferred in df.columns: return preferred
    low = {c.lower(): c for c in df.columns}
    if preferred.lower() in low: return low[preferred.lower()]
    for a in alts:
        if a in df.columns: return a
        if a.lower() in low: return low[a.lower()]
    raise KeyError(f"Column not found for {preferred}")

def load_dataset(path: str) -> pd.DataFrame:
    # Try multiple path variations
    paths_to_try = [
        path,
        os.path.join("..", path),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), path),
        os.path.join("/Users/jstwx07/Desktop/projects/RouteTO", path)
    ]
    
    actual_path = None
    for p in paths_to_try:
        if os.path.exists(p):
            actual_path = p
            break
    
    if not actual_path:
        raise FileNotFoundError(f"DATA_PATH not found in any of: {paths_to_try}")
    
    print(f"📁 Loading data from: {actual_path}")
    df = pd.read_csv(actual_path) if actual_path.endswith(".csv") else pd.read_json(actual_path)
    lat  = _infer_column(df, settings.LAT_COL,  ["Latitude","latitude","Y","y"])
    lng  = _infer_column(df, settings.LNG_COL,  ["Longitude","longitude","X","x"])
    date = _infer_column(df, settings.DATE_COL, ["occurrence_date","Date","reported_date","date_occured","occurrenceyear"])
    typ  = _infer_column(df, settings.TYPE_COL, ["offence","offense","category","crime","event_type"])
    out = df.rename(columns={lat:"lat", lng:"lng", date:"date", typ:"crime_type"}).copy()
    out["date"] = pd.to_datetime(out["date"], errors="coerce", utc=True)
    out["lat"]  = pd.to_numeric(out["lat"], errors="coerce")
    out["lng"]  = pd.to_numeric(out["lng"], errors="coerce")
    out = out.dropna(subset=["lat","lng","date"])
    return out[["lat","lng","crime_type","date"]]

def ensure_loaded():
    global DF
    if DF is None:
        DF = load_dataset(settings.DATA_PATH)
    return DF

def filter_df(start=None, end=None, crime_type=None, bbox=None):
    import pandas as pd
    df = ensure_loaded()
    if start: df = df[df["date"] >= pd.to_datetime(start, utc=True)]
    if end:   df = df[df["date"] <= pd.to_datetime(end,   utc=True)]
    if crime_type:
        df = df[df["crime_type"].str.contains(crime_type, case=False, na=False)]
    if bbox:
        min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
        df = df[(df.lat>=min_lat)&(df.lat<=max_lat)&(df.lng>=min_lng)&(df.lng<=max_lng)]
    return df
