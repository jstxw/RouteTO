"""
Spatial indexing system for crime data with weight calculation and fast spatial queries.

GOAL: Load crimes CSV (columns: lat,lng,crime_type,date ISO8601), compute per-row weight (recency + severity),
project to UTM (EPSG:32617), build a Shapely STRtree spatial index for fast queries.

REQUIREMENTS:
- pandas, shapely, pyproj
- Provide functions:
    load_index(csv_path: str) -> dict
        Returns {
            'df': DataFrame (with columns: lat,lng,crime_type,date,weight,pt,pt_wgs),
            'tree': STRtree,
            'points': List[Point],   # UTM points matching df rows order
            'weights': List[float],  # same order
            'to_utm': callable(lon,lat)->(x,y),
            'to_wgs': callable(x,y)->(lon,lat)
        }
    crime_weight(crime_type: str, date: pd.Timestamp) -> float   # 0.2..1.0

ASSUMPTIONS:
- Unknown crime_type defaults to severity 0.5
- Recency function: 1 / (1 + age_days / 30)
- Final weight = clip(0.2, 1.0, 0.4*severity + 0.6*recency)
- Drop rows with missing lat/lng/date.

TESTS:
- load_index(...) should not throw.
- Returned lists points/weights lengths equal to len(df).
"""

from __future__ import annotations
from typing import Dict, Callable, List, Tuple
import pandas as pd
from shapely.geometry import Point
from shapely.strtree import STRtree
from pyproj import Transformer
import numpy as np
from datetime import datetime

# Crime severity mapping (0.0 to 1.0)
SEVERITY = {
    "Assault": 1.0,
    "Robbery": 0.9,
    "Break and Enter": 0.7,
    "Theft": 0.6,
    "Auto Theft": 0.6,
}

def crime_weight(crime_type: str, date: pd.Timestamp) -> float:
    """
    Calculate crime weight based on severity and recency.
    
    Args:
        crime_type: Type of crime (e.g., "Assault", "Theft")
        date: Crime occurrence date
        
    Returns:
        Weight value between 0.2 and 1.0
    """
    # Get severity (default 0.5 for unknown crime types)
    severity = SEVERITY.get(crime_type, 0.5)
    
    # Calculate recency factor
    current_date = pd.Timestamp.now()
    age_days = (current_date - date).days
    recency = 1 / (1 + age_days / 30)
    
    # Calculate final weight: 40% severity + 60% recency
    weight = 0.4 * severity + 0.6 * recency
    
    # Clip to range [0.2, 1.0]
    return np.clip(weight, 0.2, 1.0)


def load_index(csv_path: str) -> Dict[str, object]:
    """
    Load crime data and create spatial index with weights.
    
    Args:
        csv_path: Path to CSV file with columns: lat,lng,crime_type,date
        
    Returns:
        Dictionary containing:
        - 'df': DataFrame with processed crime data
        - 'tree': STRtree spatial index
        - 'points': List of UTM Point geometries
        - 'weights': List of computed weights
        - 'to_utm': Function to convert WGS84 to UTM
        - 'to_wgs': Function to convert UTM to WGS84
    """
    
    # Load CSV data
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['lat', 'lng', 'crime_type', 'date']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Convert date column to datetime
    df['date'] = pd.to_datetime(df['date'])
    
    # Drop rows with missing lat/lng/date
    initial_len = len(df)
    df = df.dropna(subset=['lat', 'lng', 'date'])
    dropped_count = initial_len - len(df)
    if dropped_count > 0:
        print(f"Dropped {dropped_count} rows with missing lat/lng/date")
    
    # Reset index after dropping rows
    df = df.reset_index(drop=True)
    
    # Calculate weights for each crime
    df['weight'] = df.apply(lambda row: crime_weight(row['crime_type'], row['date']), axis=1)
    
    # Set up coordinate transformers
    # WGS84 (EPSG:4326) to UTM Zone 17N (EPSG:32617) for Toronto area
    transformer_to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32617", always_xy=True)
    transformer_to_wgs = Transformer.from_crs("EPSG:32617", "EPSG:4326", always_xy=True)
    
    def to_utm(lon: float, lat: float) -> Tuple[float, float]:
        """Convert WGS84 coordinates to UTM."""
        return transformer_to_utm.transform(lon, lat)
    
    def to_wgs(x: float, y: float) -> Tuple[float, float]:
        """Convert UTM coordinates to WGS84."""
        return transformer_to_wgs.transform(x, y)
    
    # Project points to UTM
    utm_coords = [to_utm(row['lng'], row['lat']) for _, row in df.iterrows()]
    
    # Create Shapely Point geometries
    utm_points = [Point(x, y) for x, y in utm_coords]
    wgs_points = [Point(row['lng'], row['lat']) for _, row in df.iterrows()]
    
    # Add geometry columns to dataframe
    df['pt'] = utm_points  # UTM points
    df['pt_wgs'] = wgs_points  # WGS84 points
    
    # Build spatial index (STRtree) using UTM coordinates
    tree = STRtree(utm_points)
    
    # Extract weights as list
    weights = df['weight'].tolist()
    
    return {
        'df': df,
        'tree': tree,
        'points': utm_points,
        'weights': weights,
        'to_utm': to_utm,
        'to_wgs': to_wgs
    }


# Example usage and testing functions
def test_load_index():
    """Test function for load_index - basic functionality check."""
    try:
        # This would use the actual CSV path in production
        csv_path = "data/Major_Crime_Indicators_Open_Data_-3805566126367379926.csv"
        result = load_index(csv_path)
        
        # Verify all required keys are present
        required_keys = ['df', 'tree', 'points', 'weights', 'to_utm', 'to_wgs']
        for key in required_keys:
            assert key in result, f"Missing key: {key}"
        
        # Verify lengths match
        df_len = len(result['df'])
        points_len = len(result['points'])
        weights_len = len(result['weights'])
        
        assert points_len == df_len, f"Points length {points_len} != DataFrame length {df_len}"
        assert weights_len == df_len, f"Weights length {weights_len} != DataFrame length {df_len}"
        
        print(f"✅ load_index test passed. Processed {df_len} crime records.")
        return True
        
    except Exception as e:
        print(f"❌ load_index test failed: {e}")
        return False


def test_crime_weight():
    """Test function for crime_weight calculation."""
    try:
        # Test recent high-severity crime
        recent_date = pd.Timestamp.now() - pd.Timedelta(days=1)
        weight = crime_weight("Assault", recent_date)
        assert 0.2 <= weight <= 1.0, f"Weight {weight} out of range"
        assert weight > 0.8, f"Recent assault should have high weight, got {weight}"
        
        # Test old low-severity crime
        old_date = pd.Timestamp.now() - pd.Timedelta(days=365)
        weight = crime_weight("Theft", old_date)
        assert 0.2 <= weight <= 1.0, f"Weight {weight} out of range"
        assert weight < 0.5, f"Old theft should have low weight, got {weight}"
        
        # Test unknown crime type
        weight = crime_weight("Unknown", recent_date)
        assert 0.2 <= weight <= 1.0, f"Weight {weight} out of range"
        
        print("✅ crime_weight test passed.")
        return True
        
    except Exception as e:
        print(f"❌ crime_weight test failed: {e}")
        return False


if __name__ == "__main__":
    """Run tests when module is executed directly."""
    print("Running spatial index tests...")
    test_crime_weight()
    test_load_index()
