
# 🗺️ RouteTO - Crime-Aware Route Planning for Toronto

RouteTO is an intelligent route planning application that helps users navigate Toronto safely by visualizing crime data and recommending the safest routes between destinations. The application combines real-time crime data analysis with interactive mapping to provide comprehensive safety insights.

## 🎯 Features

### 🗺️ Interactive Crime Mapping
- **Real-time Crime Visualization**: Display Toronto crime incidents on an interactive map
- **Multiple View Modes**: Switch between individual markers, crime clusters, and heatmap density views
- **Crime Type Filtering**: Filter by specific crime categories (Assault, Auto Theft, Break and Enter, Robbery, Theft Over)
- **Temporal Filtering**: View crimes from specific time periods (Last 14 Days, Month, 6 Months, Year)
- **Dynamic Loading**: Crime data loads based on current map viewport for optimal performance

### 🛣️ Smart Route Analysis
- **Safety-First Routing**: Analyze multiple route options and identify the safest path
- **Crime Risk Assessment**: Calculate crime density and safety ratings for each route
- **Visual Route Comparison**: Color-coded routes (Green: Low Crime, Yellow: Medium, Red: High)
- **Detailed Route Metrics**: Distance, duration, crime density, and nearby incident counts

### 📍 Location Services
- **Address Search**: Search for Toronto addresses using OpenStreetMap geocoding
- **Current Location**: Get user's current location using browser geolocation API
- **Quick Locations**: Fast navigation to popular Toronto destinations (CN Tower, Downtown, Airport)
- **Smart Positioning**: Automatically position map view under control panels

### 🎛️ User Interface
- **Responsive Design**: Optimized for desktop and mobile devices
- **Draggable Controls**: Movable view mode controls for customized layout
- **Navigation Bar**: Clean top navigation with Home and Map sections
- **Filter Indicators**: Visual feedback showing active crime type and date filters

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18** with functional components and hooks
- **Vite** for fast development and optimized builds
- **Leaflet.js** for interactive mapping capabilities
- **CSS-in-JS** for dynamic styling and responsive design

### Backend Stack
- **FastAPI** (Python) for high-performance API development
- **Pandas** for efficient data processing and analysis
- **NumPy** for numerical computations
- **Uvicorn** ASGI server for production deployment

### Mapping Technology
- **Leaflet.js**: Open-source mapping library for interactive maps
- **OpenStreetMap**: Base map tiles and geocoding services
- **GeoJSON**: Standard format for geographic data exchange
- **Leaflet.heat**: Plugin for heatmap visualizations
- **OSRM**: Open Source Routing Machine for route calculations

## 📊 Toronto Crime Dataset

### Data Source
The application uses official Toronto Police Service crime data from the City of Toronto's Open Data Portal:
- **Dataset**: Major Crime Indicators (MCI)
- **URL**: https://open.toronto.ca/dataset/major-crime-indicators/
- **Update Frequency**: Weekly
- **Coverage**: All reported major crimes in Toronto

### Data Structure
```csv
LAT_WGS84, LONG_WGS84, MCI_CATEGORY, OCC_DATE, LOCATION_TYPE, PREMISES_TYPE
43.6532,   -79.3832,   Assault,     2024-01-15, Outside, Street
```

### Key Fields Used
- **LAT_WGS84/LONG_WGS84**: Precise geographic coordinates (WGS84 projection)
- **MCI_CATEGORY**: Crime classification (Assault, Auto Theft, Break and Enter, Robbery, Theft Over)
- **OCC_DATE**: Date and time of incident occurrence
- **LOCATION_TYPE**: Indoor/outdoor classification
- **PREMISES_TYPE**: Specific location context

### Data Processing Pipeline
1. **CSV Parsing**: Pandas reads and validates crime data structure
2. **Spatial Indexing**: Geographic coordinates processed for efficient querying
3. **Temporal Filtering**: Date-based filtering for recent crime analysis
4. **Bounding Box Filtering**: Viewport-based data loading for performance
5. **GeoJSON Conversion**: Transform tabular data to geographic format

## 🗂️ GeoJSON Implementation

### What is GeoJSON?
GeoJSON is a format for encoding geographic data structures using JSON. RouteTO extensively uses GeoJSON for efficient map data transfer and visualization.

### GeoJSON Structure in RouteTO
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-79.3832, 43.6532]
      },
      "properties": {
        "crime_type": "Assault",
        "occurrence_date": "2024-01-15",
        "location": "King St W / University Ave"
      }
    }
  ]
}
```

### Benefits of GeoJSON
- **Standard Format**: Widely supported by mapping libraries
- **Efficient Transfer**: Compact JSON representation
- **Rich Properties**: Attach metadata to geographic features
- **Leaflet Integration**: Native support in Leaflet.js

## 📁 Data Setup Instructions

### CSV Download Process

Due to GitHub's 100MB file size limit, the crime data CSV must be downloaded separately:

1. **Visit Toronto Open Data Portal**:
   - Navigate to: https://open.toronto.ca/dataset/major-crime-indicators/
   - Look for "Major Crime Indicators" dataset

2. **Download the CSV File**:
   - Click on the CSV download link (typically ~200-500MB)
   - File format: `Major_Crime_Indicators_Open_Data_[ID].csv`

3. **Place in Data Directory**:
   ```
   RouteTO/
   └── data/
       └── Major_Crime_Indicators_Open_Data_-3805566126367379926.csv
   ```

4. **Alternative Data Sources**:
   - Any Toronto crime CSV with required columns will work
   - Minimum required fields: `LAT_WGS84`, `LONG_WGS84`, `MCI_CATEGORY`, `OCC_DATE`

### Data Validation
The application automatically validates:
- Coordinate bounds (Toronto area: 43.5-43.9°N, 79.1-79.7°W)
- Date formats and ranges
- Crime category standardization
- Null value handling

## 🚀 FastAPI Backend

### Why FastAPI?
- **High Performance**: Comparable to NodeJS and Go
- **Modern Python**: Native async/await support
- **Automatic Documentation**: Interactive API docs with Swagger UI
- **Type Safety**: Pydantic models for request/response validation
- **Standards-Based**: OpenAPI and JSON Schema compliance

### API Architecture
```python
# FastAPI application structure
app = FastAPI(title="RouteTO API", version="1.0.0")

# CORS middleware for frontend integration
app.add_middleware(CORSMiddleware, 
                  allow_origins=["http://localhost:3000"],
                  allow_methods=["GET", "POST"])

# Automatic request validation
@app.get("/crimes/geojson", response_model=GeoJSONFeatureCollection)
async def get_crimes_geojson(bbox: str, limit: int = 1000):
    # Data processing and response
```

### Performance Features
- **Async Processing**: Non-blocking I/O for concurrent requests
- **Response Caching**: HTTP cache headers for map data
- **Data Pagination**: Configurable result limits
- **Bounding Box Optimization**: Efficient spatial queries

### API Endpoints

#### Crime Data Endpoints
```
GET /crimes/geojson
Query Parameters:
- bbox: "min_lng,min_lat,max_lng,max_lat"
- limit: number (default: 1000, max: 5000)
- crime_type: string (optional filter)
- sort: "recent" for temporal sorting
- date_filter: "14days"|"1month"|"6months"|"1year"
```

#### Clustering Endpoints
```
GET /clusters/geojson
Query Parameters:
- bbox: bounding box coordinates
- k: number of clusters (default: 25)
- crime_type: optional crime type filter
```

#### Route Analysis Endpoints
```
GET /routes/analyze
Query Parameters:
- start_lat, start_lng: starting coordinates
- end_lat, end_lng: destination coordinates
- buffer_m: crime search radius in meters
- crime_type: optional crime filter
- sort: temporal sorting option
```

### Data Processing Pipeline
1. **Request Validation**: Pydantic models ensure data integrity
2. **Spatial Filtering**: Pandas operations for bounding box queries
3. **Crime Analysis**: NumPy calculations for risk assessment
4. **Route Optimization**: OSRM integration for path finding
5. **Response Formatting**: GeoJSON serialization for frontend

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** 16+ and npm
- **Python** 3.8+ and pip
- **Git** for version control

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Data Setup
1. Download Toronto crime CSV (see Data Setup section above)
2. Place in `data/` directory
3. Backend will automatically load and process the data

## 🔧 Development

### Frontend Development
- **Hot Reload**: Vite provides instant updates during development
- **Component Structure**: Modular React components for maintainability
- **State Management**: React hooks for local state, props for data flow
- **Styling**: CSS-in-JS for dynamic and responsive design

### Backend Development
- **Interactive Docs**: Visit `http://localhost:8002/docs` for API exploration
- **Development Server**: Uvicorn with auto-reload for code changes
- **Testing**: Built-in FastAPI testing framework
- **Logging**: Structured logging for debugging and monitoring

### Mapping Integration
- **Leaflet Events**: Map movement triggers data reload
- **Layer Management**: Dynamic addition/removal of map layers
- **Performance Optimization**: Viewport-based data loading
- **User Interaction**: Click handlers for route selection

## 📈 Performance Considerations

### Frontend Optimization
- **Lazy Loading**: Components load only when needed
- **Data Caching**: Browser caching for repeated map requests
- **Debounced Search**: Prevent excessive API calls during user input
- **Efficient Re-rendering**: React optimization patterns

### Backend Optimization
- **Spatial Indexing**: Efficient geographic queries
- **Response Caching**: HTTP cache headers reduce server load
- **Data Pagination**: Prevent memory issues with large datasets
- **Async Processing**: Handle multiple concurrent requests

### Mapping Performance
- **Viewport Loading**: Only load visible map data
- **Layer Optimization**: Efficient marker and polygon rendering
- **Cluster Aggregation**: Reduce visual complexity in dense areas
- **Smooth Animations**: Optimized map transitions and interactions

## 🔒 Security & Privacy

### Data Privacy
- **No User Data Storage**: Location data stays in browser
- **Anonymous Usage**: No user tracking or identification
- **Secure Connections**: HTTPS enforcement in production
- **CORS Protection**: Restricted cross-origin access

### API Security
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize all user inputs
- **Error Handling**: Secure error messages
- **Access Control**: API endpoint restrictions

## 🌟 Future Enhancements

### Planned Features
- **Real-time Crime Alerts**: Push notifications for nearby incidents
- **Historical Trends**: Long-term crime pattern analysis
- **Community Integration**: User-submitted safety reports
- **Mobile App**: Native iOS/Android applications
- **Advanced Routing**: Multi-modal transportation options

### Technical Improvements
- **Machine Learning**: Predictive crime modeling
- **WebSocket Support**: Real-time data updates
- **Offline Capabilities**: Progressive Web App features
- **Advanced Analytics**: Crime trend visualization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## 📞 Support

For questions, issues, or contributions, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for Toronto community safety

