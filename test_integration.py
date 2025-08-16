#!/usr/bin/env python3
"""
Integration test for spatial index in RouteTO
Tests the new spatial endpoints and functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health_endpoint():
    """Test health endpoint shows spatial index is active"""
    print("🔍 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Health check passed: {data}")
        
        if data.get('spatial_index'):
            print("✅ Spatial index is active")
        else:
            print("❌ Spatial index not detected")
    else:
        print(f"❌ Health check failed: {response.status_code}")

def test_spatial_endpoints():
    """Test new spatial endpoints"""
    # Toronto City Hall coordinates
    lat, lng = 43.6534, -79.3839
    
    print(f"\n🗺️ Testing spatial endpoints around Toronto City Hall ({lat}, {lng})...")
    
    # Test radius search
    print("Testing radius search (500m)...")
    try:
        response = requests.get(f"{BASE_URL}/crimes/radius", params={
            'lat': lat,
            'lng': lng,
            'radius': 500,
            'limit': 10
        })
        
        if response.status_code == 200:
            crimes = response.json()
            print(f"✅ Found {len(crimes)} crimes within 500m")
        else:
            print(f"❌ Radius search failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("⚠️ Server not running - start with: python run_server.py")
        return
    
    # Test nearest crimes
    print("Testing nearest crimes search...")
    try:
        response = requests.get(f"{BASE_URL}/crimes/nearest", params={
            'lat': lat,
            'lng': lng,
            'count': 5
        })
        
        if response.status_code == 200:
            crimes = response.json()
            print(f"✅ Found {len(crimes)} nearest crimes")
            
            # Show distances if available
            for i, crime in enumerate(crimes[:3]):
                distance = crime.get('distance_meters', 'unknown')
                crime_type = crime.get('crime_type', 'Unknown')
                print(f"   {i+1}. {crime_type} - {distance}m away")
        else:
            print(f"❌ Nearest search failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing nearest crimes: {e}")

def test_geojson_endpoints():
    """Test GeoJSON endpoints for weights"""
    print(f"\n📍 Testing GeoJSON endpoints with weight data...")
    
    try:
        response = requests.get(f"{BASE_URL}/crimes/geojson", params={
            'limit': 5
        })
        
        if response.status_code == 200:
            geojson = response.json()
            features = geojson.get('features', [])
            
            if features:
                print(f"✅ GeoJSON endpoint working: {len(features)} features")
                
                # Check if weights are present
                first_feature = features[0]
                props = first_feature.get('properties', {})
                
                if 'weight' in props:
                    weight = props['weight']
                    crime_type = props.get('crime_type', 'Unknown')
                    print(f"✅ Weight data present: {crime_type} = {weight:.3f}")
                else:
                    print("⚠️ Weight data not found in GeoJSON properties")
            else:
                print("⚠️ No features returned")
        else:
            print(f"❌ GeoJSON endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing GeoJSON: {e}")

if __name__ == "__main__":
    print("🚀 RouteTO Spatial Index Integration Test")
    print("=" * 50)
    
    test_health_endpoint()
    test_spatial_endpoints() 
    test_geojson_endpoints()
    
    print("\n" + "=" * 50)
    print("🎯 Integration test complete!")
    print("\nTo start the server: python run_server.py")
    print("To view the map: http://localhost:3000")
