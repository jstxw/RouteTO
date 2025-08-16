#!/usr/bin/env python3
"""
Data downloader for RouteTO
Downloads Toronto crime data from Open Data portal during deployment
"""
import os
import requests
import pandas as pd
from pathlib import Path

def download_toronto_crime_data():
    """Download and cache Toronto crime data"""
    
    # Create data directory if it doesn't exist
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    # Local file path
    local_file = data_dir / "Major_Crime_Indicators_Open_Data_-3805566126367379926.csv"
    
    # If file exists and is recent (less than 24 hours), use it
    if local_file.exists():
        file_age_hours = (os.path.getmtime(local_file) - os.path.getctime(local_file)) / 3600
        if file_age_hours < 24:
            print(f"✅ Using cached data file: {local_file}")
            return str(local_file)
    
    print("📥 Downloading Toronto crime data...")
    
    try:
        # Toronto Open Data API
        api_url = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show"
        params = {"id": "major-crime-indicators"}
        
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        
        package_data = response.json()
        
        # Find the CSV resource
        csv_url = None
        for resource in package_data['result']['resources']:
            if resource['format'].upper() == 'CSV':
                csv_url = resource['url']
                break
        
        if not csv_url:
            raise ValueError("No CSV resource found in the package")
        
        print(f"📡 Downloading from: {csv_url}")
        
        # Download the CSV file
        csv_response = requests.get(csv_url)
        csv_response.raise_for_status()
        
        # Save to local file
        with open(local_file, 'wb') as f:
            f.write(csv_response.content)
        
        print(f"✅ Data downloaded successfully: {local_file}")
        return str(local_file)
        
    except Exception as e:
        print(f"❌ Error downloading data: {e}")
        
        # Fallback: create a small sample dataset for testing
        print("🔄 Creating sample dataset for testing...")
        sample_data = pd.DataFrame({
            'OCC_DATE': ['2024-01-01', '2024-01-02', '2024-01-03'],
            'LAT_WGS84': [43.7, 43.71, 43.72],
            'LONG_WGS84': [-79.4, -79.41, -79.42],
            'MCI_CATEGORY': ['Assault', 'Theft', 'Break and Enter']
        })
        
        sample_file = data_dir / "sample_crime_data.csv"
        sample_data.to_csv(sample_file, index=False)
        print(f"✅ Sample data created: {sample_file}")
        return str(sample_file)

if __name__ == "__main__":
    download_toronto_crime_data()
