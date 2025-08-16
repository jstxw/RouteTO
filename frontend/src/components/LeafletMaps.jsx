import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import RouteAnalysis from './RouteAnalysis';
import FloatingTitle from './FloatingTitle';
import {
  fetchCrimesGeoJSON,
  fetchClustersGeoJSON,
  mapToBbox,
  getCrimeColor,
  createCrimePopup,
  createClusterPopup,
  convertToHeatmapData,
  convertToWeightedHeatmapData,
  getHeatmapConfig
} from '../utils/api';

function LeafletMaps() {
  const [map, setMap] = useState(null);
  const [crimeLayer, setCrimeLayer] = useState(null);
  const [clusterLayer, setClusterLayer] = useState(null);
  const [heatmapLayer, setHeatmapLayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('markers'); // 'markers', 'clusters', 'heatmap'
  const mapRef = useRef(null);

  useEffect(() => {
    // Check if map is already initialized
    if (map || mapRef.current) {
      return;
    }

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const mapContainer = document.getElementById('map');
      
      // Check if container exists and is not already initialized
      if (!mapContainer) {
        console.error('Map container not found');
        return;
      }

      // Clear any existing map instance
      if (mapContainer._leaflet_id) {
        console.warn('Map container already initialized, cleaning up...');
        mapContainer._leaflet_id = null;
      }

      try {
        // Initialize the map
        const mapInstance = L.map('map', {
          zoomControl: false // We'll add custom controls
        }).setView([43.6532, -79.3832], 11); // Toronto coordinates

        setMap(mapInstance);
        mapRef.current = mapInstance;

        // Add zoom control to bottom right
        L.control.zoom({
          position: 'bottomleft'
        }).addTo(mapInstance);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance);

        // Force resize after initialization
        setTimeout(() => {
          mapInstance.invalidateSize();
          console.log('Map container size:', document.getElementById('map').getBoundingClientRect());
        }, 100);

        // Load initial data
        loadMapData(mapInstance);

        // Add event listener for map movement to update data based on bbox
        mapInstance.on('moveend', () => {
          loadMapData(mapInstance);
        });

        // Add zoom event listener for heatmap configuration updates
        mapInstance.on('zoomend', () => {
          if (viewMode === 'heatmap' && heatmapLayer) {
            updateHeatmapConfig(mapInstance);
          }
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setError('Failed to initialize map. Please refresh the page.');
      }
    }, 50);

    // Cleanup function
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
          setMap(null);
        } catch (error) {
          console.warn('Error during map cleanup:', error);
        }
      }
    };
  }, []); // Empty dependency array to run only once

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (map) {
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  // Handle view mode changes
  useEffect(() => {
    if (map) {
      loadMapData(map);
    }
  }, [viewMode]);

  const loadMapData = async (mapInstance) => {
    setLoading(true);
    setError(null);

    try {
      const bbox = mapToBbox(mapInstance);

      // Load data based on current view mode
      if (viewMode === 'heatmap') {
        await loadHeatmapData(mapInstance, bbox);
      } else {
        // Load both crime and cluster data in parallel for markers/clusters view
        await Promise.all([
          viewMode === 'markers' ? loadCrimeData(mapInstance, bbox) : Promise.resolve(),
          viewMode === 'clusters' ? loadClusterData(mapInstance, bbox) : Promise.resolve()
        ]);
      }
    } catch (err) {
      setError('Failed to load map data. Please try again.');
      console.error('Error loading map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCrimeData = async (mapInstance, bbox) => {
    try {
      const geojsonData = await fetchCrimesGeoJSON({
        bbox,
        limit: 1000
      });

      // Remove existing crime layer
      if (crimeLayer) {
        mapInstance.removeLayer(crimeLayer);
      }

      // Add new crime data as GeoJSON layer
      const newCrimeLayer = L.geoJSON(geojsonData, {
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 4,
            fillColor: getCrimeColor(feature.properties.crime_type),
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
          });
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(createCrimePopup(feature));
        }
      }).addTo(mapInstance);

      setCrimeLayer(newCrimeLayer);
    } catch (error) {
      console.error('Error loading crime data:', error);
      throw error;
    }
  };

  const loadClusterData = async (mapInstance, bbox) => {
    try {
      const geojsonData = await fetchClustersGeoJSON({
        bbox,
        k: 25
      });

      // Remove existing cluster layer
      if (clusterLayer) {
        mapInstance.removeLayer(clusterLayer);
      }

      // Add new cluster data as GeoJSON layer
      const newClusterLayer = L.geoJSON(geojsonData, {
        pointToLayer: (feature, latlng) => {
          const count = feature.properties.count;
          const radius = Math.min(Math.max(count / 10, 8), 30);
          return L.circleMarker(latlng, {
            radius: radius,
            fillColor: '#ff7800',
            color: '#000',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
          });
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(createClusterPopup(feature));
        }
      }).addTo(mapInstance);

      setClusterLayer(newClusterLayer);
    } catch (error) {
      console.error('Error loading cluster data:', error);
      throw error;
    }
  };

  const loadHeatmapData = async (mapInstance, bbox) => {
    try {
      const geojsonData = await fetchCrimesGeoJSON({
        bbox,
        limit: 5000 // Higher limit for heatmap data
      });

      // Remove existing heatmap layer
      if (heatmapLayer) {
        mapInstance.removeLayer(heatmapLayer);
      }

      // Convert GeoJSON to weighted heatmap data format
      const heatmapData = convertToWeightedHeatmapData(geojsonData);

      if (heatmapData.length === 0) {
        console.warn('No heatmap data available');
        return;
      }

      // Get heatmap configuration based on current zoom
      const config = getHeatmapConfig(mapInstance.getZoom());

      // Create heatmap layer
      const newHeatmapLayer = L.heatLayer(heatmapData, config).addTo(mapInstance);

      setHeatmapLayer(newHeatmapLayer);
    } catch (error) {
      console.error('Error loading heatmap data:', error);
      throw error;
    }
  };

  const updateHeatmapConfig = (mapInstance) => {
    if (!heatmapLayer) return;

    const config = getHeatmapConfig(mapInstance.getZoom());
    heatmapLayer.setOptions(config);
  };

  const clearAllLayers = (mapInstance) => {
    if (crimeLayer) {
      mapInstance.removeLayer(crimeLayer);
      setCrimeLayer(null);
    }
    if (clusterLayer) {
      mapInstance.removeLayer(clusterLayer);
      setClusterLayer(null);
    }
    if (heatmapLayer) {
      mapInstance.removeLayer(heatmapLayer);
      setHeatmapLayer(null);
    }
  };

  const handleViewModeChange = (newMode) => {
    if (map && newMode !== viewMode) {
      clearAllLayers(map);
      setViewMode(newMode);
      loadMapData(map);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {/* Floating View Mode Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        padding: '10px',
        background: 'rgba(248, 249, 250, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(5px)'
      }}>
        <strong style={{ color: '#333' }}>View Mode:</strong>
        <button
          onClick={() => handleViewModeChange('markers')}
          style={{
            padding: '6px 12px',
            backgroundColor: viewMode === 'markers' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Individual Crimes
        </button>
        <button
          onClick={() => handleViewModeChange('clusters')}
          style={{
            padding: '6px 12px',
            backgroundColor: viewMode === 'clusters' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Crime Clusters
        </button>
        <button
          onClick={() => handleViewModeChange('heatmap')}
          style={{
            padding: '6px 12px',
            backgroundColor: viewMode === 'heatmap' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Crime Heatmap
        </button>
      </div>

      {/* Floating Title */}
      <FloatingTitle />

      {/* Fullscreen Map */}
      <div
        id="map"
        style={{
          height: '100vh',
          width: '100vw',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      >
        {loading && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            zIndex: 1000,
            fontSize: '12px',
            fontWeight: '500'
          }}>
            Loading...
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(220, 53, 69, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            zIndex: 1000,
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}
        
        {/* Route Analysis Component */}
        {map && <RouteAnalysis map={map} />}
      </div>
    </div>
  );
}

export default LeafletMaps;