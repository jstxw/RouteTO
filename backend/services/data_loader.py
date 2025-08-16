import os, pandas as pd
from typing import List
import sys
import requests
from pathlib import Path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from core.config import settings

DF = None  # cached dataframe

def download_data_if_missing(path: str) -> str:
    """Download data if local file doesn't exist"""
    if os.path.exists(path):
        return path
    
    print(f"⚠️  Data file not found: {path}")
    print("📥 Attempting to download Toronto crime data...")
    
    try:
        # Run the download script
        import subprocess
        result = subprocess.run([sys.executable, "download_data.py"], 
                              capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(__file__)))
        
        if result.returncode == 0:
            print("✅ Data download completed")
            return path if os.path.exists(path) else create_sample_data()
        else:
            print(f"❌ Download failed: {result.stderr}")
            return create_sample_data()
            
    except Exception as e:
        print(f"❌ Error during download: {e}")
        return create_sample_data()

def create_sample_data() -> str:
    """Create a small sample dataset for testing"""
    print("🔄 Creating sample dataset...")
    
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    sample_data = pd.DataFrame({
        'OCC_DATE': ['2024-01-01', '2024-01-02', '2024-01-03'] * 100,
        'LAT_WGS84': [43.7, 43.71, 43.72] * 100,
        'LONG_WGS84': [-79.4, -79.41, -79.42] * 100,
        'MCI_CATEGORY': ['Assault', 'Theft', 'Break and Enter'] * 100
    })
    
    sample_file = data_dir / "sample_crime_data.csv"
    sample_data.to_csv(sample_file, index=False)
    print(f"✅ Sample data created: {sample_file}")
    return str(sample_file)

def _infer_column(df: pd.DataFrame, preferred: str, alts: List[str]) -> str:
    if preferred in df.columns: return preferred
    low = {c.lower(): c for c in df.columns}
    if preferred.lower() in low: return low[preferred.lower()]
    for a in alts:
        if a in df.columns: return a
        if a.lower() in low: return low[a.lower()]
    raise KeyError(f"Column not found for {preferred}")

def load_dataset(path: str) -> pd.DataFrame:
    # First try to download data if missing
    actual_path = download_data_if_missing(path)
    
    # Try multiple path variations
    paths_to_try = [
        actual_path,
        path,
        os.path.join("..", path),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), path),
        os.path.join("/Users/jstwx07/Desktop/projects/RouteTO", path),
        "data/sample_crime_data.csv"  # Fallback to sample data
    ]
    
    final_path = None
    for p in paths_to_try:
        if os.path.exists(p):
            final_path = p
            break
    
    if not final_path:
        # Last resort: create sample data
        final_path = create_sample_data()
    
    print(f"📁 Loading data from: {final_path}")
    df = pd.read_csv(final_path) if final_path.endswith(".csv") else pd.read_json(final_path)
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
        df = df[df["crime_type"].str.lower() == crime_type.lower()]
    if bbox:
        min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
        df = df[(df.lat>=min_lat)&(df.lat<=max_lat)&(df.lng>=min_lng)&(df.lng<=max_lng)]
    return df
