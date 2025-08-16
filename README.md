
## Data Setup

Due to GitHub's 100MB file size limit, the crime data CSV is not included in this repository.

### To get the app working:

1. Download Toronto Police crime data:
   - Visit: https://open.toronto.ca/dataset/major-crime-indicators/
   - Download the CSV file
   - Place it in the `data/` directory as: `Major_Crime_Indicators_Open_Data_-3805566126367379926.csv`

2. Or use any Toronto crime CSV with columns: `LAT_WGS84`, `LONG_WGS84`, `MCI_CATEGORY`, `OCC_DATE`

### API Endpoints

#### Regular JSON Endpoints
- Health: `GET /api/health`
- Crimes: `GET /api/crimes?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=100&bbox=min_lng,min_lat,max_lng,max_lat`
- Clusters: `GET /api/clusters?k=10&bbox=min_lng,min_lat,max_lng,max_lat`

#### GeoJSON Endpoints (New! 🗺️)
- Crimes GeoJSON: `GET /api/crimes/geojson?bbox=min_lng,min_lat,max_lng,max_lat&limit=1000`
- Clusters GeoJSON: `GET /api/clusters/geojson?bbox=min_lng,min_lat,max_lng,max_lat&k=25`

#### Enhanced Features
- **🗺️ GeoJSON Format**: New endpoints return proper GeoJSON for better map integration
- **📦 Bbox Filtering**: All endpoints now support bounding box filtering for map viewport optimization
- **⚡ Caching Headers**: HTTP cache headers added for improved map performance
- **🎯 Smart Clustering**: Cluster visualization includes suggested radius for better map display

#### Query Parameters
- `bbox`: Bounding box as `min_lng,min_lat,max_lng,max_lat` (e.g., `-79.6,43.5,-79.1,43.8` for Toronto)
- `start/end`: Date filtering in YYYY-MM-DD format
- `crime_type`: Filter by crime type (partial string matching)
- `limit`: Number of results (max 50,000 for regular, 5,000 for GeoJSON)
- `k`: Number of clusters for clustering endpoints

#### Performance Features
- 5-minute cache for crime data endpoints
- 10-minute cache for cluster data endpoints
- ETags for efficient cache validation
- Proper CORS headers for cross-origin map integration

- Interactive docs: `http://localhost:PORT/docs`

