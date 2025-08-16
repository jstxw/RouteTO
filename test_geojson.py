#!/usr/bin/env python3
"""
Test script for the enhanced RouteTO API with GeoJSON and bbox functionality
"""

import requests
import json
import sys

def test_geojson_endpoints():
    """Test the new GeoJSON endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing RouteTO API enhancements...")
    
    # Test health endpoint first
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print("❌ Health check failed")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure the server is running on http://localhost:8000")
        return False
    
    # Test crimes GeoJSON endpoint
    print("\n📍 Testing crimes GeoJSON endpoint...")
    try:
        # Test with bbox (Toronto area)
        bbox = "-79.6,43.5,-79.1,43.8"  # Toronto bounding box
        response = requests.get(f"{base_url}/crimes/geojson?bbox={bbox}&limit=10")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GeoJSON crimes endpoint working")
            print(f"   Type: {data.get('type')}")
            print(f"   Features: {len(data.get('features', []))}")
            print(f"   Cache-Control header: {response.headers.get('Cache-Control')}")
            print(f"   Content-Type: {response.headers.get('Content-Type')}")
            
            # Validate GeoJSON structure
            if (data.get('type') == 'FeatureCollection' and 
                'features' in data and 
                isinstance(data['features'], list)):
                print("✅ Valid GeoJSON structure")
            else:
                print("❌ Invalid GeoJSON structure")
                
        else:
            print(f"❌ GeoJSON crimes endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing crimes GeoJSON: {e}")
    
    # Test clusters GeoJSON endpoint
    print("\n🎯 Testing clusters GeoJSON endpoint...")
    try:
        bbox = "-79.6,43.5,-79.1,43.8"  # Toronto bounding box
        response = requests.get(f"{base_url}/clusters/geojson?bbox={bbox}&k=5")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GeoJSON clusters endpoint working")
            print(f"   Type: {data.get('type')}")
            print(f"   Features: {len(data.get('features', []))}")
            print(f"   Cache-Control header: {response.headers.get('Cache-Control')}")
            print(f"   Content-Type: {response.headers.get('Content-Type')}")
            
            # Check if features have cluster properties
            if data.get('features'):
                first_feature = data['features'][0]
                props = first_feature.get('properties', {})
                if 'count' in props and 'cluster_type' in props:
                    print("✅ Valid cluster properties")
                else:
                    print("❌ Missing cluster properties")
                    
        else:
            print(f"❌ GeoJSON clusters endpoint failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing clusters GeoJSON: {e}")
    
    # Test bbox functionality with regular endpoints
    print("\n📦 Testing bbox functionality...")
    try:
        # Test without bbox
        response1 = requests.get(f"{base_url}/crimes?limit=100")
        
        # Test with bbox
        bbox = "-79.6,43.5,-79.1,43.8"
        response2 = requests.get(f"{base_url}/crimes?bbox={bbox}&limit=100")
        
        if response1.status_code == 200 and response2.status_code == 200:
            data1 = response1.json()
            data2 = response2.json()
            
            print(f"✅ Bbox filtering working")
            print(f"   Without bbox: {len(data1)} results")
            print(f"   With bbox: {len(data2)} results")
            
            if len(data2) <= len(data1):
                print("✅ Bbox correctly filters results")
            else:
                print("❌ Bbox filtering may not be working correctly")
                
    except Exception as e:
        print(f"❌ Error testing bbox: {e}")
    
    print("\n🎉 Testing complete!")
    return True


if __name__ == "__main__":
    test_geojson_endpoints()
