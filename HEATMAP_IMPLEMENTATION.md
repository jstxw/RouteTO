# 🔥 RouteTO Heatmap Implementation

## Overview
Added advanced heatmap visualization to RouteTO using the `leaflet.heat` plugin with weighted crime data and bbox filtering.

## 🎯 Heatmap Features

### 1. **Smart Crime Weighting System**
- **Violent Crimes (Weight: 1.0):** Assault, Homicide, Robbery, Sexual offenses
- **Property Crimes (Weight: 0.6):** Theft, Burglary, Auto Theft, Fraud
- **Other Crimes (Weight: 0.3-0.4):** Vandalism, Drug offenses, Traffic violations

### 2. **Adaptive Configuration**
- **Radius:** 20-30 pixels (adapts to zoom level)
- **Blur:** 15-25 pixels (smooth gradient blobs)
- **Max Zoom:** 18 (maintains concentration when zoomed in)
- **Custom Gradient:** Blue → Cyan → Green → Yellow → Orange → Red

### 3. **Performance Optimizations**
- **Bbox Filtering:** Only loads data for visible map area
- **Higher Data Limit:** 5000 points for better density visualization
- **Zoom-Adaptive:** Configuration updates automatically with zoom level
- **HTTP Caching:** 5-minute cache for optimal performance

## 🚀 Installation & Setup

### Quick Start
```bash
# Make script executable and run
chmod +x start_with_heatmap.sh
./start_with_heatmap.sh
```

### Manual Installation
```bash
cd frontend
npm install leaflet.heat
npm run dev
```

## 📊 Usage

### View Mode Controls
The map now includes three view modes:

1. **Individual Crimes** - Color-coded markers for each crime
2. **Crime Clusters** - Aggregated crime hotspots  
3. **Crime Heatmap** - Density visualization with intensity weighting

### Heatmap Interaction
- **Pan/Zoom:** Automatically updates data using bbox filtering
- **Zoom Adaptive:** Radius and blur adjust for optimal visualization
- **Weighted Intensity:** More serious crimes appear "hotter"
- **Real-time:** Updates when you move the map

## 🎨 Heatmap Configuration

### Default Settings
```javascript
{
  radius: 20-30,        // Adapts to zoom level
  blur: 15-25,          // Smooth gradient
  maxZoom: 18,          // Max zoom level
  max: 1.0,             // Maximum intensity
  gradient: {
    0.0: '#000080',     // Dark blue (low)
    0.2: '#0000FF',     // Blue
    0.4: '#00FFFF',     // Cyan
    0.6: '#00FF00',     // Green
    0.8: '#FFFF00',     // Yellow
    0.9: '#FF8000',     // Orange
    1.0: '#FF0000'      // Red (high)
  }
}
```

### Crime Weight System
```javascript
{
  // Violent crimes (highest impact)
  'assault': 1.0,
  'homicide': 1.0,
  'robbery': 1.0,
  'sexual': 1.0,
  
  // Property crimes (medium impact)
  'theft': 0.6,
  'burglary': 0.6,
  'auto theft': 0.6,
  'fraud': 0.6,
  
  // Other crimes (lower impact)
  'vandalism': 0.4,
  'drug': 0.4,
  'traffic': 0.3
}
```

## 🔧 API Integration

### Enhanced Endpoints
The heatmap uses the existing GeoJSON endpoints with enhanced data limits:

```bash
# Heatmap data (higher limit for better density)
GET /crimes/geojson?bbox={bbox}&limit=5000

# Regular markers/clusters
GET /crimes/geojson?bbox={bbox}&limit=1000
GET /clusters/geojson?bbox={bbox}&k=25
```

### Bbox Filtering
All requests automatically include bounding box filtering:
```
bbox=min_lng,min_lat,max_lng,max_lat
```

## 📱 User Interface

### View Mode Buttons
- Clean, responsive button interface
- Active state highlighting
- Real-time mode switching
- Loading indicators

### Information Panel
- Dynamic information based on current view mode
- Performance metrics
- Feature explanations
- Technical details

## 🎯 Performance Benefits

### Before Heatmap
- ❌ Static marker visualization only
- ❌ No density visualization
- ❌ Limited data insights

### After Heatmap
- ✅ **3 visualization modes** for different use cases
- ✅ **Weighted density** showing crime severity
- ✅ **Zoom-adaptive** configuration for optimal viewing
- ✅ **Bbox filtering** for performance
- ✅ **Real-time updates** on map interaction
- ✅ **5000+ data points** for accurate density mapping

## 🧪 Testing

### Frontend Testing
1. Start backend: `python run_server.py`
2. Start frontend: `npm run dev` 
3. Open http://localhost:5173
4. Test all three view modes
5. Verify bbox filtering by panning/zooming

### Performance Testing
- Monitor network requests in browser dev tools
- Verify bbox parameters in API calls
- Check cache headers in response
- Confirm zoom-adaptive behavior

## 🎨 Customization

### Modify Crime Weights
Edit `frontend/src/utils/api.js`:
```javascript
export function getCrimeWeight(crimeType) {
  const weights = {
    'your_crime_type': 0.8,  // Custom weight
    // ... other weights
  };
}
```

### Adjust Heatmap Appearance
Edit `frontend/src/utils/api.js`:
```javascript
export function getHeatmapConfig(zoom = 11) {
  return {
    radius: 25,              // Fixed radius
    blur: 20,                // Fixed blur
    gradient: {              // Custom colors
      0.0: '#your_color',
      1.0: '#your_color'
    }
  };
}
```

## 📋 File Changes Summary

### New Features Added:
- `leaflet.heat` plugin integration
- Weighted crime heatmap visualization
- Zoom-adaptive configuration
- Three-mode view switching
- Enhanced bbox filtering for heatmaps

### Files Modified:
- `frontend/package.json` - Added leaflet.heat dependency
- `frontend/src/components/LeafletMaps.jsx` - Heatmap implementation
- `frontend/src/utils/api.js` - Heatmap utilities and weighting
- `start_with_heatmap.sh` - Quick setup script

## 🎉 Result

You now have a fully functional crime heatmap with:
- **Intelligent weighting** based on crime severity
- **Adaptive visualization** that responds to zoom level
- **High-performance** bbox filtering
- **Professional UI** with multiple view modes
- **Real-time updates** for interactive exploration

The heatmap provides immediate visual insights into crime density patterns and hotspots across Toronto, making it an powerful tool for crime analysis and urban planning!
