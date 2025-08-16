"""
Route analysis router for RouteTO - Safe route recommendations with crime risk scoring.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Response
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.route_analysis import analyze_routes, compare_routes, osrm_routes
from services import data_loader
from services.geojson_utils import add_cache_headers

router = APIRouter(prefix="/routes", tags=["routes"])


# Response models
class RoutePoint(BaseModel):
    lat: float
    lng: float


class RouteAnalysisResponse(BaseModel):
    routes: List[Dict[str, Any]]
    comparison: Dict[str, Any]
    metadata: Dict[str, Any]


@router.get("/analyze")
def analyze_safe_routes(
    response: Response,
    start_lat: float = Query(..., description="Starting latitude"),
    start_lng: float = Query(..., description="Starting longitude"),
    end_lat: float = Query(..., description="Ending latitude"),
    end_lng: float = Query(..., description="Ending longitude"),
    buffer_m: float = Query(180.0, ge=50, le=500, description="Safety buffer in meters"),
    crime_type: Optional[str] = Query(None, description="Filter by specific crime type (e.g., 'Assault', 'Robbery', 'Theft')")
) -> Dict[str, Any]:
    """
    Analyze route alternatives and calculate crime risk scores.
    
    Returns route options sorted by safety with risk analysis.
    """
    # Add caching headers
    add_cache_headers(response, "routes", 300)
    response.headers["ETag"] = f'"routes-{hash((start_lat, start_lng, end_lat, end_lng, buffer_m))}"'
    
    try:
        # Try to get spatial index for risk analysis
        spatial_index = None
        try:
            from services import spatial_data_loader
            if crime_type:
                spatial_index = spatial_data_loader.get_filtered_spatial_index(crime_type)
            else:
                spatial_index = spatial_data_loader.ensure_spatial_index()
        except (ImportError, Exception) as e:
            print(f"⚠️ Spatial analysis unavailable: {e}")
            # Continue without spatial analysis
            pass
        
        if spatial_index:
            # Analyze routes with risk scoring
            routes = analyze_routes(start_lat, start_lng, end_lat, end_lng, spatial_index, buffer_m)
            
            if not routes:
                raise HTTPException(status_code=404, detail="No routes found between the specified locations")
            
            # Compare routes and get recommendations
            comparison = compare_routes(routes)
            
            # Prepare response with risk analysis
            result = {
                "routes": routes,
                "comparison": comparison,
                "metadata": {
                    "start_point": {"lat": start_lat, "lng": start_lng},
                    "end_point": {"lat": end_lat, "lng": end_lng},
                    "buffer_meters": buffer_m,
                    "crime_type_filter": crime_type,
                    "total_routes": len(routes),
                    "analysis_type": "full_risk_analysis",
                    "analysis_timestamp": None
                }
            }
        else:
            # Fallback to basic OSRM routes without risk analysis
            routes = osrm_routes(start_lat, start_lng, end_lat, end_lng)
            
            if not routes:
                raise HTTPException(status_code=404, detail="No routes found between the specified locations")
            
            # Add basic metadata without risk scores
            for i, route in enumerate(routes):
                route["route_id"] = i
                route["risk_score"] = None
                route["nearby_crimes"] = None
            
            # Prepare response without risk analysis
            result = {
                "routes": routes,
                "comparison": {
                    "safest_route": 0,  # Default to first route
                    "safety_improvement": None,
                    "analysis_note": "Risk analysis unavailable - showing basic routes"
                },
                "metadata": {
                    "start_point": {"lat": start_lat, "lng": start_lng},
                    "end_point": {"lat": end_lat, "lng": end_lng},
                    "buffer_meters": buffer_m,
                    "total_routes": len(routes),
                    "analysis_type": "basic_routes_only",
                    "analysis_timestamp": None
                }
            }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route analysis failed: {str(e)}")


@router.get("/osrm")
def get_osrm_routes(
    response: Response,
    start_lat: float = Query(..., description="Starting latitude"),
    start_lng: float = Query(..., description="Starting longitude"),
    end_lat: float = Query(..., description="Ending latitude"),
    end_lng: float = Query(..., description="Ending longitude")
) -> Dict[str, Any]:
    """
    Get raw route data from OSRM without risk analysis.
    
    Useful for testing or when spatial analysis isn't needed.
    """
    # Add caching headers
    add_cache_headers(response, "routes", 600)
    response.headers["ETag"] = f'"osrm-{hash((start_lat, start_lng, end_lat, end_lng))}"'
    
    try:
        routes = osrm_routes(start_lat, start_lng, end_lat, end_lng)
        
        return {
            "routes": routes,
            "metadata": {
                "start_point": {"lat": start_lat, "lng": start_lng},
                "end_point": {"lat": end_lat, "lng": end_lng},
                "total_routes": len(routes),
                "provider": "OSRM"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OSRM routing failed: {str(e)}")


@router.get("/test")
def test_route_system(response: Response) -> Dict[str, Any]:
    """
    Test the route analysis system with a predefined Toronto route.
    """
    add_cache_headers(response, "test", 60)
    
    # Toronto City Hall to CN Tower
    start_lat, start_lng = 43.6534, -79.3839
    end_lat, end_lng = 43.6426, -79.3871
    
    try:
        # Test basic OSRM connectivity
        routes = osrm_routes(start_lat, start_lng, end_lat, end_lng)
        
        # Test spatial index availability
        spatial_available = False
        try:
            from services import spatial_data_loader
            spatial_index = spatial_data_loader.ensure_spatial_index()
            spatial_available = True
        except:
            pass
        
        return {
            "status": "ok",
            "osrm_connectivity": True,
            "routes_found": len(routes),
            "spatial_index_available": spatial_available,
            "test_route": {
                "from": "Toronto City Hall",
                "to": "CN Tower",
                "coordinates": {
                    "start": {"lat": start_lat, "lng": start_lng},
                    "end": {"lat": end_lat, "lng": end_lng}
                }
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "osrm_connectivity": False,
            "spatial_index_available": False
        }
