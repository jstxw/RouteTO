#!/usr/bin/env python3
"""
Test script to verify CSV data loading
"""
import sys
import os

# Add backend to path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

def test_data_loading():
    try:
        from services.data_loader import load_dataset, ensure_loaded
        from core.config import settings
        
        print("🔍 Testing data loading...")
        print(f"📁 Data path: {settings.DATA_PATH}")
        
        # Load the dataset
        df = ensure_loaded()
        
        print(f"✅ Successfully loaded {len(df):,} rows")
        print(f"📊 Columns: {list(df.columns)}")
        
        if len(df) > 0:
            print(f"📅 Date range: {df['date'].min()} to {df['date'].max()}")
            print(f"🗺️  Coordinate range:")
            print(f"   Latitude: {df['lat'].min():.4f} to {df['lat'].max():.4f}")
            print(f"   Longitude: {df['lng'].min():.4f} to {df['lng'].max():.4f}")
            print(f"🚨 Crime types: {df['crime_type'].unique()[:5]}")
            
            print("\n📋 Sample data:")
            print(df[['lat', 'lng', 'crime_type', 'date']].head(3).to_string())
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_data_loading()
