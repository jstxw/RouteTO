#!/usr/bin/env python3
"""
Comprehensive test for RouteTO backend components
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_all_components():
    print("🧪 COMPREHENSIVE ROUTETO BACKEND TEST")
    print("=" * 50)
    
    try:
        # Test 1: Schemas
        print("\n1️⃣ Testing Schemas...")
        from schemas.crime import CrimePoint, ClusterPoint
        from datetime import datetime
        
        crime = CrimePoint(lat=43.6532, lng=-79.3832, crime_type='Assault', date=datetime.now())
        cluster = ClusterPoint(center_lat=43.6532, center_lng=-79.3832, count=25)
        print("   ✅ CrimePoint and ClusterPoint schemas work")
        
        # Test 2: Configuration
        print("\n2️⃣ Testing Configuration...")
        from core.config import settings
        print(f"   📁 Data path: {settings.DATA_PATH}")
        print(f"   📊 Columns: {settings.LAT_COL}, {settings.LNG_COL}, {settings.TYPE_COL}, {settings.DATE_COL}")
        print("   ✅ Configuration loaded successfully")
        
        # Test 3: Data Loading
        print("\n3️⃣ Testing Data Loading...")
        from services.data_loader import ensure_loaded, filter_df
        df = ensure_loaded()
        print(f"   📊 Total records: {len(df):,}")
        print(f"   📅 Date range: {df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')}")
        
        # Test filtering
        recent = filter_df(start='2024-01-01')
        print(f"   🕐 2024+ records: {len(recent):,}")
        
        assaults = filter_df(crime_type='Assault')
        print(f"   🚨 Assault records: {len(assaults):,}")
        print("   ✅ Data loading and filtering work")
        
        # Test 4: Clustering
        print("\n4️⃣ Testing Clustering...")
        from services.clusters import kmeans_clusters
        sample_data = filter_df(start='2024-01-01', end='2024-01-31')
        clusters = kmeans_clusters(sample_data, k=5, max_points=1000)
        print(f"   🎯 Generated {len(clusters)} clusters from January 2024 data")
        if clusters:
            avg_crimes_per_cluster = sum(c['count'] for c in clusters) / len(clusters)
            print(f"   📈 Average crimes per cluster: {avg_crimes_per_cluster:.1f}")
        print("   ✅ Clustering service works")
        
        # Test 5: Router Import
        print("\n5️⃣ Testing Router...")
        from routers.crimes import router
        print("   ✅ Crimes router imports successfully")
        
        # Test 6: Main App
        print("\n6️⃣ Testing Main App...")
        from main import app
        print("   ✅ FastAPI app imports successfully")
        
        print("\n" + "=" * 50)
        print("🎉 ALL TESTS PASSED! Your backend is ready!")
        print("💡 You can now start the server with: python3 start.py")
        print("📍 Then visit: http://localhost:8002/docs")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_all_components()
