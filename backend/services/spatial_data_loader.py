"""
Spatial data loader with integrated spatial indexing for fast queries.
Replaces the basic data_loader.py with spatial index capabilities.
"""

import os
import pandas as pd
from typing import List, Optional, Dict, Any, Tuple
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from core.config import settings
from services.spatial_index import load_index, crime_weight
from shapely.geometry import Point
from shapely.strtree import STRtree

# Global spatial index cache
SPATIAL_INDEX = None

def _infer_column(df: pd.DataFrame, preferred: str, alts: List[str]) -> str:
    """Infer column name from dataframe with fallback options."""
    if preferred in df.columns: 
        return preferred
    low = {c.lower(): c for c in df.columns}
    if preferred.lower() in low: 
        return low[preferred.lower()]
    for a in alts:
        if a in df.columns: 
            return a
        if a.lower() in low: 
            return low[a.lower()]
    raise KeyError(f"Column not found for {preferred}")


def ensure_spatial_index() -> Dict[str, Any]:
    """Ensure spatial index is loaded and return it."""
    global SPATIAL_INDEX
    
    if SPATIAL_INDEX is None:
        print(f"🗺️ Building spatial index from: {settings.DATA_PATH}")
        
        # Try multiple path variations
        paths_to_try = [
            settings.DATA_PATH,
            os.path.join("..", settings.DATA_PATH),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), settings.DATA_PATH),
            os.path.join("/Users/jstwx07/Desktop/projects/RouteTO", settings.DATA_PATH)
        ]
        
        actual_path = None
        for p in paths_to_try:
            if os.path.exists(p):
                actual_path = p
                break
        
        if not actual_path:
            raise FileNotFoundError(f"DATA_PATH not found in any of: {paths_to_try}")
        
        # Load and standardize the CSV first
        df = pd.read_csv(actual_path) if actual_path.endswith(".csv") else pd.read_json(actual_path)
        
        # Standardize column names
        lat = _infer_column(df, settings.LAT_COL, ["Latitude","latitude","Y","y"])
        lng = _infer_column(df, settings.LNG_COL, ["Longitude","longitude","X","x"])
        date = _infer_column(df, settings.DATE_COL, ["occurrence_date","Date","reported_date","date_occured","occurrenceyear"])
        typ = _infer_column(df, settings.TYPE_COL, ["offence","offense","category","crime","event_type"])
        
        standardized_df = df.rename(columns={lat:"lat", lng:"lng", date:"date", typ:"crime_type"}).copy()
        standardized_df["date"] = pd.to_datetime(standardized_df["date"], errors="coerce", utc=True)
        standardized_df["lat"] = pd.to_numeric(standardized_df["lat"], errors="coerce")
        standardized_df["lng"] = pd.to_numeric(standardized_df["lng"], errors="coerce")
        standardized_df = standardized_df.dropna(subset=["lat","lng","date"])
        final_df = standardized_df[["lat","lng","crime_type","date"]]
        
        # Save standardized CSV temporarily for spatial index
        temp_path = "/tmp/standardized_crimes.csv"
        final_df.to_csv(temp_path, index=False)
        
        # Load spatial index
        SPATIAL_INDEX = load_index(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        print(f"✅ Spatial index built: {len(SPATIAL_INDEX['df'])} records")
    
    return SPATIAL_INDEX


def ensure_loaded() -> pd.DataFrame:
    """Legacy compatibility - return dataframe from spatial index."""
    spatial_index = ensure_spatial_index()
    return spatial_index['df']


def filter_df_spatial(start=None, end=None, crime_type=None, bbox=None) -> pd.DataFrame:
    """
    Advanced spatial filtering using spatial index.
    Much faster than the original filter_df for bbox queries.
    """
    spatial_index = ensure_spatial_index()
    df = spatial_index['df'].copy()
    
    # Apply temporal filters
    if start:
        df = df[df["date"] >= pd.to_datetime(start, utc=True)]
    if end:
        df = df[df["date"] <= pd.to_datetime(end, utc=True)]
    
    # Apply crime type filter
    if crime_type:
        df = df[df["crime_type"].str.contains(crime_type, case=False, na=False)]
    
    # Apply spatial filter using spatial index
    if bbox:
        min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
        
        # Convert bbox to UTM for spatial query
        to_utm = spatial_index['to_utm']
        min_x, min_y = to_utm(min_lng, min_lat)
        max_x, max_y = to_utm(max_lng, max_lat)
        
        # Create bbox geometry for spatial query
        from shapely.geometry import box
        bbox_geom = box(min_x, min_y, max_x, max_y)
        
        # Use spatial index to find intersecting points
        tree = spatial_index['tree']
        points = spatial_index['points']
        
        # Query spatial index
        possible_matches_idx = list(tree.query(bbox_geom))
        
        if possible_matches_idx:
            # Filter dataframe to only include spatially matched records
            df = df.iloc[possible_matches_idx].copy()
        else:
            # No spatial matches
            df = df.iloc[0:0].copy()  # Empty dataframe with same columns
    
    return df


def filter_df(start=None, end=None, crime_type=None, bbox=None) -> pd.DataFrame:
    """
    Main filtering function - uses spatial index when available.
    Maintains backward compatibility with existing API.
    """
    try:
        return filter_df_spatial(start, end, crime_type, bbox)
    except Exception as e:
        print(f"⚠️ Spatial filtering failed, falling back to basic filtering: {e}")
        # Fallback to basic filtering
        df = ensure_loaded()
        if start: 
            df = df[df["date"] >= pd.to_datetime(start, utc=True)]
        if end:   
            df = df[df["date"] <= pd.to_datetime(end, utc=True)]
        if crime_type:
            df = df[df["crime_type"].str.contains(crime_type, case=False, na=False)]
        if bbox:
            min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
            df = df[(df.lat>=min_lat)&(df.lat<=max_lat)&(df.lng>=min_lng)&(df.lng<=max_lng)]
        return df


def query_radius(lat: float, lng: float, radius_meters: float, limit: int = 1000) -> pd.DataFrame:
    """
    NEW: Find crimes within radius using spatial index.
    
    Args:
        lat: Center latitude (WGS84)
        lng: Center longitude (WGS84) 
        radius_meters: Search radius in meters
        limit: Maximum number of results
        
    Returns:
        DataFrame of crimes within radius, sorted by distance
    """
    spatial_index = ensure_spatial_index()
    
    # Convert center to UTM
    center_x, center_y = spatial_index['to_utm'](lng, lat)
    center_point = Point(center_x, center_y)
    
    # Create search buffer
    search_buffer = center_point.buffer(radius_meters)
    
    # Query spatial index
    tree = spatial_index['tree']
    possible_matches_idx = list(tree.query(search_buffer))
    
    if not possible_matches_idx:
        # Return empty dataframe
        return spatial_index['df'].iloc[0:0].copy()
    
    # Get matching records
    matches_df = spatial_index['df'].iloc[possible_matches_idx].copy()
    
    # Calculate actual distances
    points = spatial_index['points']
    distances = []
    
    for idx in possible_matches_idx:
        point = points[idx]
        distance = center_point.distance(point)
        distances.append(distance)
    
    matches_df['distance_meters'] = distances
    
    # Filter by exact radius and sort by distance
    within_radius = matches_df[matches_df['distance_meters'] <= radius_meters]
    result = within_radius.sort_values('distance_meters').head(limit)
    
    return result


def query_nearest(lat: float, lng: float, count: int = 10) -> pd.DataFrame:
    """
    NEW: Find nearest crimes using spatial index.
    
    Args:
        lat: Center latitude (WGS84)
        lng: Center longitude (WGS84)
        count: Number of nearest crimes to return
        
    Returns:
        DataFrame of nearest crimes, sorted by distance
    """
    spatial_index = ensure_spatial_index()
    
    # Convert center to UTM
    center_x, center_y = spatial_index['to_utm'](lng, lat)
    center_point = Point(center_x, center_y)
    
    # Query spatial index for nearest neighbors
    tree = spatial_index['tree']
    points = spatial_index['points']
    
    # Get all points and calculate distances
    nearest_idx = list(tree.nearest(center_point, return_all=False, max_distance=float('inf')))
    
    if not nearest_idx:
        return spatial_index['df'].iloc[0:0].copy()
    
    # Calculate distances for sorting
    distances = []
    limited_idx = nearest_idx[:count * 2]  # Get more than needed for sorting
    
    for idx in limited_idx:
        point = points[idx]
        distance = center_point.distance(point)
        distances.append((idx, distance))
    
    # Sort by distance and take top count
    distances.sort(key=lambda x: x[1])
    final_idx = [idx for idx, _ in distances[:count]]
    
    # Get result dataframe
    result_df = spatial_index['df'].iloc[final_idx].copy()
    result_df['distance_meters'] = [dist for _, dist in distances[:count]]
    
    return result_df


def reload_spatial_index(path: Optional[str] = None):
    """
    Reload spatial index with new data path.
    """
    global SPATIAL_INDEX
    
    if path:
        settings.DATA_PATH = path
    
    SPATIAL_INDEX = None  # Clear cache
    return ensure_spatial_index()


# Legacy compatibility exports
DF = None  # For backward compatibility with old code

def load_dataset(path: str) -> pd.DataFrame:
    """Legacy compatibility function."""
    global DF
    old_path = settings.DATA_PATH
    settings.DATA_PATH = path
    try:
        spatial_index = ensure_spatial_index()
        DF = spatial_index['df']
        return DF
    finally:
        settings.DATA_PATH = old_path
