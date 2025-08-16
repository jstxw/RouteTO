from typing import Dict, Any, List
import pandas as pd
from datetime import datetime


def dataframe_to_geojson(df: pd.DataFrame, lat_col: str = "lat", lng_col: str = "lng") -> Dict[str, Any]:
    """Convert a pandas DataFrame to GeoJSON format"""
    features = []
    
    for _, row in df.iterrows():
        # Handle potential missing or invalid coordinates
        try:
            lat = float(row[lat_col])
            lng = float(row[lng_col])
            
            # Skip invalid coordinates
            if pd.isna(lat) or pd.isna(lng):
                continue
                
        except (ValueError, TypeError):
            continue
        
        # Create properties from all other columns
        properties = {}
        for col in df.columns:
            if col not in [lat_col, lng_col]:
                value = row[col]
                # Handle datetime objects
                if isinstance(value, datetime):
                    properties[col] = value.isoformat()
                elif pd.isna(value):
                    properties[col] = None
                else:
                    properties[col] = value
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "properties": properties
        }
        features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


def clusters_to_geojson(clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Convert cluster data to GeoJSON format"""
    features = []
    
    for cluster in clusters:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(cluster["center_lng"]), float(cluster["center_lat"])]
            },
            "properties": {
                "count": cluster["count"],
                "cluster_type": "crime_cluster",
                "radius": min(max(cluster["count"] / 10, 8), 30)  # Suggested radius for display
            }
        }
        features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


def add_cache_headers(response, cache_type: str = "default", max_age: int = 300):
    """Add appropriate caching headers for map data"""
    if cache_type == "geojson":
        response.headers["Cache-Control"] = f"public, max-age={max_age}"
        response.headers["Content-Type"] = "application/geo+json"
    elif cache_type == "api":
        response.headers["Cache-Control"] = f"public, max-age={max_age}"
        response.headers["Content-Type"] = "application/json"
    
    # Add CORS headers for map performance
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
