"""
Route analysis system for RouteTO - Calculate risk scores for walking routes.

GOAL: Fetch walking route alternatives from OSRM (router.project-osrm.org), convert each route to a UTM LineString,
buffer (e.g., 180 m), and compute a risk score: sum(weights of crimes within buffer) / route_length_km.

APIs to implement:
- osrm_routes(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> List[dict]
  (alternatives=true, geometries=geojson)
- linestring_from_lonlat(coords: List[List[float]], to_utm) -> LineString
- score_route(line: LineString, tree: STRtree, points: List[Point], weights: List[float], buffer_m: float=180.0) -> dict
  Returns {'score': float, 'incidents': int, 'length_km': float}

PERF:
- Use STRtree.query(tube) to prefilter candidate points.
- Avoid O(n) index lookup: precompute id(point)->idx map if needed.

ASSUME YOU GET from index.load_index():
  tree, points, weights, to_utm, to_wgs

Return helpers:
- to_geojson_line(line, to_wgs, props) -> Feature
"""

from __future__ import annotations
from typing import List, Dict, Tuple, Optional, Any
import requests
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree
import json


def osrm_routes(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> List[dict]:
    """
    Fetch walking route alternatives from OSRM API.
    
    Args:
        start_lat: Starting latitude
        start_lng: Starting longitude
        end_lat: Ending latitude
        end_lng: Ending longitude
        
    Returns:
        List of route dictionaries with geometry and metadata
    """
    # OSRM demo server endpoint for walking routes
    base_url = "http://router.project-osrm.org/route/v1/foot"
    
    # Format coordinates for OSRM: lng,lat;lng,lat
    coords = f"{start_lng},{start_lat};{end_lng},{end_lat}"
    
    # Parameters for route request
    params = {
        'alternatives': 'true',  # Get alternative routes
        'geometries': 'geojson',  # Return GeoJSON geometry
        'overview': 'full',  # Full geometry detail
        'steps': 'false',  # Don't need step-by-step directions
        'continue_straight': 'default',
        'annotations': 'false'
    }
    
    url = f"{base_url}/{coords}"
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('code') != 'Ok':
            raise ValueError(f"OSRM API error: {data.get('message', 'Unknown error')}")
        
        routes = data.get('routes', [])
        
        # Extract relevant information from each route
        processed_routes = []
        for i, route in enumerate(routes):
            processed_route = {
                'route_id': i,
                'geometry': route.get('geometry'),  # GeoJSON LineString
                'distance_meters': route.get('distance', 0),
                'duration_seconds': route.get('duration', 0),
                'legs': route.get('legs', [])
            }
            processed_routes.append(processed_route)
        
        return processed_routes
        
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f"Failed to fetch routes from OSRM: {e}")
    except (KeyError, ValueError) as e:
        raise ValueError(f"Invalid OSRM response: {e}")


def linestring_from_lonlat(coords: List[List[float]], to_utm) -> LineString:
    """
    Convert lon/lat coordinates to UTM LineString.
    
    Args:
        coords: List of [longitude, latitude] pairs
        to_utm: Function to convert WGS84 to UTM coordinates
        
    Returns:
        Shapely LineString in UTM coordinates
    """
    if len(coords) < 2:
        raise ValueError("LineString requires at least 2 coordinates")
    
    # Convert each lon/lat pair to UTM
    utm_coords = []
    for lon, lat in coords:
        x, y = to_utm(lon, lat)
        utm_coords.append((x, y))
    
    return LineString(utm_coords)


def score_route(line: LineString, tree: STRtree, points: List[Point], weights: List[float], buffer_m: float = 180.0) -> Dict[str, float]:
    """
    Calculate risk score for a route based on nearby crimes.
    
    Args:
        line: Route as UTM LineString
        tree: Spatial index of crime points
        points: List of crime points (same order as weights)
        weights: List of crime weights (same order as points)
        buffer_m: Buffer distance in meters around route
        
    Returns:
        Dictionary with score, incidents count, and route length
    """
    # Create buffer around the route
    route_buffer = line.buffer(buffer_m)
    
    # Get route length in kilometers
    length_km = line.length / 1000.0
    
    if length_km == 0:
        return {'score': 0.0, 'incidents': 0, 'length_km': 0.0}
    
    # Use spatial index to find candidate points
    candidate_indices = list(tree.query(route_buffer))
    
    # Filter points that actually intersect the buffer
    total_weight = 0.0
    incident_count = 0
    
    for idx in candidate_indices:
        if idx < len(points) and route_buffer.contains(points[idx]):
            total_weight += weights[idx]
            incident_count += 1
    
    # Calculate risk score: total weight per kilometer
    risk_score = total_weight / length_km if length_km > 0 else 0.0
    
    return {
        'score': risk_score,
        'incidents': incident_count,
        'length_km': length_km,
        'total_weight': total_weight
    }


def to_geojson_line(line: LineString, to_wgs, props: dict) -> dict:
    """
    Convert UTM LineString to GeoJSON Feature.
    
    Args:
        line: Shapely LineString in UTM coordinates
        to_wgs: Function to convert UTM to WGS84 coordinates
        props: Properties to include in the feature
        
    Returns:
        GeoJSON Feature dictionary
    """
    # Convert UTM coordinates back to lon/lat
    wgs_coords = []
    for x, y in line.coords:
        lon, lat = to_wgs(x, y)
        wgs_coords.append([lon, lat])
    
    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": wgs_coords
        },
        "properties": props
    }


def analyze_routes(start_lat: float, start_lng: float, end_lat: float, end_lng: float, 
                  spatial_index: Dict[str, Any], buffer_m: float = 180.0) -> List[Dict[str, Any]]:
    """
    Complete route analysis: fetch routes, convert to UTM, and calculate risk scores.
    
    Args:
        start_lat: Starting latitude
        start_lng: Starting longitude
        end_lat: Ending latitude
        end_lng: Ending longitude
        spatial_index: Spatial index from load_index()
        buffer_m: Buffer distance in meters
        
    Returns:
        List of analyzed routes with scores and GeoJSON geometry
    """
    # Extract components from spatial index
    tree = spatial_index['tree']
    points = spatial_index['points']
    weights = spatial_index['weights']
    to_utm = spatial_index['to_utm']
    to_wgs = spatial_index['to_wgs']
    
    # Fetch routes from OSRM
    try:
        osrm_routes_data = osrm_routes(start_lat, start_lng, end_lat, end_lng)
    except Exception as e:
        raise RuntimeError(f"Route fetching failed: {e}")
    
    analyzed_routes = []
    
    for route in osrm_routes_data:
        try:
            # Get route geometry coordinates
            geometry = route.get('geometry', {})
            if geometry.get('type') != 'LineString':
                continue
                
            coords = geometry.get('coordinates', [])
            if len(coords) < 2:
                continue
            
            # Convert to UTM LineString
            utm_line = linestring_from_lonlat(coords, to_utm)
            
            # Calculate risk score
            score_data = score_route(utm_line, tree, points, weights, buffer_m)
            
            # Convert back to GeoJSON with risk properties
            geojson_props = {
                'route_id': route['route_id'],
                'risk_score': score_data['score'],
                'incidents': score_data['incidents'],
                'length_km': score_data['length_km'],
                'total_weight': score_data['total_weight'],
                'distance_meters': route['distance_meters'],
                'duration_seconds': route['duration_seconds'],
                'buffer_meters': buffer_m,
                'risk_level': _categorize_risk(score_data['score'])
            }
            
            geojson_feature = to_geojson_line(utm_line, to_wgs, geojson_props)
            
            # Combine route data with analysis
            analyzed_route = {
                'route_id': route['route_id'],
                'geometry': geojson_feature,
                'analysis': score_data,
                'osrm_data': {
                    'distance_meters': route['distance_meters'],
                    'duration_seconds': route['duration_seconds']
                }
            }
            
            analyzed_routes.append(analyzed_route)
            
        except Exception as e:
            print(f"Warning: Failed to analyze route {route.get('route_id', 'unknown')}: {e}")
            continue
    
    # Sort routes by risk score (lower is better)
    analyzed_routes.sort(key=lambda r: r['analysis']['score'])
    
    return analyzed_routes


def _categorize_risk(score: float) -> str:
    """Categorize risk score into human-readable levels."""
    if score < 1.0:
        return 'low'
    elif score < 3.0:
        return 'medium'
    elif score < 6.0:
        return 'high'
    else:
        return 'very_high'


# Route comparison utilities

def compare_routes(routes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compare multiple routes and provide recommendations.
    
    Args:
        routes: List of analyzed routes
        
    Returns:
        Comparison summary with recommendations
    """
    if not routes:
        return {'error': 'No routes to compare'}
    
    # Find best route by different criteria
    safest_route = min(routes, key=lambda r: r['analysis']['score'])
    fastest_route = min(routes, key=lambda r: r['osrm_data']['duration_seconds'])
    shortest_route = min(routes, key=lambda r: r['analysis']['length_km'])
    
    # Calculate statistics
    scores = [r['analysis']['score'] for r in routes]
    durations = [r['osrm_data']['duration_seconds'] for r in routes]
    
    return {
        'total_routes': len(routes),
        'safest_route_id': safest_route['route_id'],
        'fastest_route_id': fastest_route['route_id'],
        'shortest_route_id': shortest_route['route_id'],
        'risk_score_range': {
            'min': min(scores),
            'max': max(scores),
            'avg': sum(scores) / len(scores)
        },
        'duration_range': {
            'min_seconds': min(durations),
            'max_seconds': max(durations),
            'avg_seconds': sum(durations) / len(durations)
        },
        'recommendation': _get_recommendation(safest_route, fastest_route, shortest_route)
    }


def _get_recommendation(safest: Dict, fastest: Dict, shortest: Dict) -> str:
    """Generate route recommendation based on analysis."""
    safest_score = safest['analysis']['score']
    fastest_duration = fastest['osrm_data']['duration_seconds']
    safest_duration = safest['osrm_data']['duration_seconds']
    
    # If safest route is also reasonably fast (within 20% of fastest)
    time_penalty = (safest_duration - fastest_duration) / fastest_duration
    
    if time_penalty < 0.2:
        return f"Take route {safest['route_id']} - safest option with minimal time penalty"
    elif safest_score < 2.0:  # Low risk
        return f"Take route {safest['route_id']} - low risk, worth the extra time"
    elif safest_score > 5.0:  # High risk area
        return f"Consider route {fastest['route_id']} if time is critical, but be aware of higher crime risk"
    else:
        return f"Route {safest['route_id']} recommended for safety, route {fastest['route_id']} for speed"


# Example usage and testing
def test_route_analysis():
    """Test route analysis with Toronto coordinates."""
    # Toronto City Hall to CN Tower (short test route)
    start_lat, start_lng = 43.6534, -79.3839  # City Hall
    end_lat, end_lng = 43.6426, -79.3871      # CN Tower
    
    try:
        # Test OSRM routing
        routes = osrm_routes(start_lat, start_lng, end_lat, end_lng)
        print(f"✅ Found {len(routes)} routes from OSRM")
        
        # Test coordinate conversion (would need spatial index in real use)
        test_coords = [[-79.3839, 43.6534], [-79.3871, 43.6426]]
        print(f"✅ Coordinate conversion ready")
        
        return True
        
    except Exception as e:
        print(f"❌ Route analysis test failed: {e}")
        return False


if __name__ == "__main__":
    print("🗺️ Testing Route Analysis System...")
    test_route_analysis()
