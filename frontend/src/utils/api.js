/**
 * API utilities for RouteTO frontend
 * Handles communication with the backend API including GeoJSON and spatial endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

/**
 * Fetch crime data in GeoJSON format
 * @param {Object} params - Query parameters
 * @param {string} params.bbox - Bounding box as 'min_lng,min_lat,max_lng,max_lat'
 * @param {string} params.start - Start date (YYYY-MM-DD)
 * @param {string} params.end - End date (YYYY-MM-DD) 
 * @param {string} params.crime_type - Crime type filter
 * @param {number} params.limit - Maximum number of results
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function fetchCrimesGeoJSON(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            searchParams.append(key, value);
        }
    });

    const url = `${API_BASE_URL}/crimes/geojson?${searchParams.toString()}`;
    console.log('🌐 Fetching crimes from URL:', url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('✅ Received response:', {
            totalFeatures: data.features?.length || 0,
            metadata: data.metadata
        });
        return data;
    } catch (error) {
        console.error('Error fetching crimes GeoJSON:', error);
        throw error;
    }
}

/**
 * Fetch cluster data in GeoJSON format
 * @param {Object} params - Query parameters
 * @param {string} params.bbox - Bounding box as 'min_lng,min_lat,max_lng,max_lat'
 * @param {string} params.start - Start date (YYYY-MM-DD)
 * @param {string} params.end - End date (YYYY-MM-DD)
 * @param {string} params.crime_type - Crime type filter
 * @param {number} params.k - Number of clusters
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function fetchClustersGeoJSON(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            searchParams.append(key, value);
        }
    });

    const url = `${API_BASE_URL}/clusters/geojson?${searchParams.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching clusters GeoJSON:', error);
        throw error;
    }
}

/**
 * Convert Leaflet map bounds to bbox string
 * @param {L.Map} map - Leaflet map instance
 * @returns {string} Bounding box as 'min_lng,min_lat,max_lng,max_lat'
 */
export function mapToBbox(map) {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
}

/**
 * Get color for crime type
 * @param {string} crimeType - Type of crime
 * @returns {string} Hex color code
 */
export function getCrimeColor(crimeType) {
    const colors = {
        'assault': '#ff0000',
        'theft': '#ff7f00',
        'burglary': '#ffff00',
        'robbery': '#7fff00',
        'vandalism': '#00ff00',
        'fraud': '#00ff7f',
        'drug': '#00ffff',
        'traffic': '#007fff',
        'break': '#ff1493',
        'auto': '#ff6347',
        'other': '#0000ff'
    };

    const lowerType = crimeType.toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
        if (lowerType.includes(key)) {
            return color;
        }
    }
    return colors.other;
}

/**
 * Create popup content for crime marker
 * @param {Object} feature - GeoJSON feature
 * @returns {string} HTML content for popup
 */
export function createCrimePopup(feature) {
    const props = feature.properties;
    const date = new Date(props.date).toLocaleDateString();

    return `
    <div style="font-family: Arial, sans-serif;">
      <h4 style="margin: 0 0 8px 0; color: #333;">Crime Details</h4>
      <div><strong>Type:</strong> ${props.crime_type}</div>
      <div><strong>Date:</strong> ${date}</div>
      <div style="margin-top: 8px; font-size: 12px; color: #666;">
        Lat: ${feature.geometry.coordinates[1].toFixed(4)}, 
        Lng: ${feature.geometry.coordinates[0].toFixed(4)}
      </div>
    </div>
  `;
}

/**
 * Create popup content for cluster marker
 * @param {Object} feature - GeoJSON feature
 * @returns {string} HTML content for popup
 */
export function createClusterPopup(feature) {
    const props = feature.properties;

    return `
    <div style="font-family: Arial, sans-serif;">
      <h4 style="margin: 0 0 8px 0; color: #333;">Crime Cluster</h4>
      <div><strong>Total Crimes:</strong> ${props.count}</div>
      <div style="margin-top: 8px; font-size: 12px; color: #666;">
        Center: ${feature.geometry.coordinates[1].toFixed(4)}, 
        ${feature.geometry.coordinates[0].toFixed(4)}
      </div>
    </div>
  `;
}

/**
 * Calculate crime weight for visualization
 * @param {string} crimeType - Type of crime
 * @param {string} dateStr - Optional: Crime date for recency calculation
 * @returns {number} Weight value between 0.2 and 1.0
 */
export function getCrimeWeight(crimeType, dateStr = null) {
    // Base severity weights
    const severityWeights = {
        // Violent crimes - highest weight
        'assault': 1.0,
        'homicide': 1.0,
        'robbery': 0.9,
        'sexual': 1.0,

        // Property crimes - medium weight
        'theft': 0.6,
        'break': 0.7,
        'burglary': 0.7,
        'auto theft': 0.6,
        'fraud': 0.6,

        // Other crimes - lower weight
        'vandalism': 0.4,
        'drug': 0.4,
        'traffic': 0.3,
        'other': 0.3
    };

    // Get base severity
    const lowerType = crimeType.toLowerCase();
    let severity = 0.5; // Default for unknown types

    for (const [key, weight] of Object.entries(severityWeights)) {
        if (lowerType.includes(key)) {
            severity = weight;
            break;
        }
    }

    // If no date provided, return severity only (legacy behavior)
    if (!dateStr) {
        return Math.max(0.3, severity);
    }

    // Calculate recency factor
    try {
        const crimeDate = new Date(dateStr);
        const now = new Date();
        const ageDays = (now - crimeDate) / (1000 * 60 * 60 * 24);
        const recency = 1 / (1 + ageDays / 30);

        // Combined weight: 40% severity + 60% recency
        const weight = 0.4 * severity + 0.6 * recency;
        return Math.max(0.2, Math.min(1.0, weight));
    } catch (error) {
        // Fallback to severity-only if date parsing fails
        return Math.max(0.3, severity);
    }
}

/**
 * Convert GeoJSON crime data to heatmap data format
 * @param {Object} geojsonData - GeoJSON FeatureCollection
 * @returns {Array} Array of [lat, lng, weight] for heatmap
 */
export function convertToHeatmapData(geojsonData) {
    if (!geojsonData.features) return [];

    return geojsonData.features.map(feature => {
        const coords = feature.geometry.coordinates;
        const weight = getCrimeWeight(feature.properties.crime_type || '');

        // Return [lat, lng, weight] format for leaflet.heat
        return [coords[1], coords[0], weight];
    });
}

/**
 * Get heatmap configuration based on zoom level
 * @param {number} zoom - Current map zoom level
 * @returns {Object} Heatmap configuration
 */
export function getHeatmapConfig(zoom = 11) {
    return {
        radius: zoom > 13 ? 30 : zoom > 11 ? 25 : 20,
        blur: zoom > 13 ? 15 : zoom > 11 ? 20 : 25,
        maxZoom: 18,
        max: 1.0,
        gradient: {
            0.0: '#000080',  // Dark blue for low intensity
            0.2: '#0000FF',  // Blue
            0.4: '#00FFFF',  // Cyan
            0.6: '#00FF00',  // Green
            0.8: '#FFFF00',  // Yellow
            0.9: '#FF8000',  // Orange
            1.0: '#FF0000'   // Red for high intensity
        }
    };
}

/**
 * NEW: Fetch crimes within radius of a point
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude 
 * @param {number} radius - Search radius in meters
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function fetchCrimesWithinRadius(lat, lng, radius, limit = 1000) {
    const searchParams = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        limit: limit.toString()
    });

    const url = `${API_BASE_URL}/crimes/radius/geojson?${searchParams.toString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch crimes within radius: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching crimes within radius:', error);
        throw error;
    }
}

/**
 * NEW: Fetch nearest crimes to a point
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} count - Number of nearest crimes to return
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function fetchNearestCrimes(lat, lng, count = 10) {
    const searchParams = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        count: count.toString()
    });

    const url = `${API_BASE_URL}/crimes/nearest/geojson?${searchParams.toString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch nearest crimes: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching nearest crimes:', error);
        throw error;
    }
}

/**
 * Enhanced heatmap data conversion with weight support
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Array} Heatmap data array with weights
 */
export function convertToWeightedHeatmapData(geojson) {
    if (!geojson || !geojson.features) return [];

    return geojson.features.map(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        // Use weight from spatial index if available, otherwise calculate
        const weight = feature.properties.weight || getCrimeWeight(feature.properties.crime_type, feature.properties.date);

        return [lat, lng, weight];
    });
}
