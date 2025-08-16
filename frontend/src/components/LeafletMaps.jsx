import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import './LeafletMaps.css';
import RouteAnalysis from './RouteAnalysis';
import FloatingTitle from './FloatingTitle';
import Location from './Location';
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
  const [selectedCrimeType, setSelectedCrimeType] = useState('All Crimes'); // Add crime type state
  const [dateFilter, setDateFilter] = useState('none'); // Changed from sortByRecency to specific date filter
  const [controlsPosition, setControlsPosition] = useState({ x: 20, y: 70 }); // Draggable position
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    // Check if map is already initialized
    if (map || mapRef.current) {
      return;
    }

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const mapContainer = mapContainerRef.current;

      // Check if container exists and is not already initialized
      if (!mapContainer) {
        console.error('Map container not found');
        return;
      }

      // Ensure container has dimensions
      const rect = mapContainer.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.error('Map container has no dimensions:', rect);
        return;
      }

      // Clear any existing map instance
      if (mapContainer._leaflet_id) {
        console.warn('Map container already initialized, cleaning up...');
        mapContainer._leaflet_id = null;
      }

      try {
        // Clear any existing content in the map container
        mapContainer.innerHTML = '';

        // Ensure container is visible and has proper styles
        mapContainer.style.display = 'block';
        mapContainer.style.position = 'absolute';
        mapContainer.style.width = '100vw';
        mapContainer.style.height = '100vh';

        // Initialize the map
        const mapInstance = L.map(mapContainer, {
          zoomControl: false,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
          boxZoom: true,
          keyboard: true,
          tap: true,
          trackResize: true,
          worldCopyJump: false,
          closePopupOnClick: true,
          bounceAtZoomLimits: true,
          wheelPxPerZoomLevel: 60,
          zoomSnap: 1,
          zoomDelta: 1,
          maxBounds: null,
          maxBoundsViscosity: 0.0
        }).setView([43.6532, -79.3832], 11);

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
          console.log('Map container size:', mapContainer.getBoundingClientRect());
          console.log('Map dragging enabled:', mapInstance.dragging.enabled());
          console.log('Map options:', mapInstance.options);

          // Test map interaction
          mapContainer.addEventListener('mousedown', (e) => {
            console.log('Map mousedown event triggered', e);
          });

          // Ensure map is interactive
          mapInstance.dragging.enable();
          mapInstance.touchZoom.enable();
          mapInstance.doubleClickZoom.enable();
          mapInstance.scrollWheelZoom.enable();
          mapInstance.boxZoom.enable();
          mapInstance.keyboard.enable();

          // Force re-enable dragging with different approach
          setTimeout(() => {
            mapInstance.dragging.disable();
            mapInstance.dragging.enable();
            console.log('Dragging re-enabled:', mapInstance.dragging.enabled());

            // Test if dragging works by adding manual event listeners
            mapInstance.on('dragstart', () => {
              console.log('Drag started');
              const mapPane = mapContainer.querySelector('.leaflet-map-pane');
              if (mapPane) {
                console.log('Map pane transform before drag:', mapPane.style.transform);
              }
            });
            mapInstance.on('drag', () => {
              console.log('Dragging...');
              const mapPane = mapContainer.querySelector('.leaflet-map-pane');
              if (mapPane) {
                console.log('Map pane transform during drag:', mapPane.style.transform);
              }
              // Force map to invalidate size and refresh
              mapInstance.invalidateSize();
            });
            mapInstance.on('dragend', () => {
              console.log('Drag ended');
              const mapPane = mapContainer.querySelector('.leaflet-map-pane');
              if (mapPane) {
                console.log('Map pane transform after drag:', mapPane.style.transform);
              }
              // Force complete refresh after drag
              mapInstance.invalidateSize();
              setTimeout(() => mapInstance.invalidateSize(), 50);
            });

            // Try clicking on the map programmatically to test
            const leafletContainer = mapContainer.querySelector('.leaflet-container');
            if (leafletContainer) {
              console.log('Found leaflet container:', leafletContainer);
              console.log('Container styles:', window.getComputedStyle(leafletContainer));
            }
          }, 200);
        }, 100);

        // Load initial data
        loadMapData(mapInstance);

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setError('Failed to initialize map. Please refresh the page.');
      }
    }, 150); // Increased timeout

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

  // Handle map movement events - separate useEffect to get fresh state values
  useEffect(() => {
    if (!map) return;

    const handleMapMove = () => {
      loadMapData(map);
    };

    const handleZoomEnd = () => {
      if (viewMode === 'heatmap' && heatmapLayer) {
        updateHeatmapConfig(map);
      }
    };

    // Add event listeners
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleZoomEnd);

    // Cleanup
    return () => {
      if (map) {
        map.off('moveend', handleMapMove);
        map.off('zoomend', handleZoomEnd);
      }
    };
  }, [map, viewMode, selectedCrimeType, dateFilter, heatmapLayer]); // Include state dependencies

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

  // Handle crime type changes
  useEffect(() => {
    if (map) {
      loadMapData(map);
    }
  }, [selectedCrimeType]);

  // Handle recency sorting changes
  useEffect(() => {
    if (map) {
      loadMapData(map);
    }
  }, [dateFilter]);

  // Handle drag events for the floating controls
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - controlsPosition.x,
      y: e.clientY - controlsPosition.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    setControlsPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, controlsPosition]);

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
      const params = {
        bbox,
        limit: 1000
      };

      // Add crime type filter if not "All Crimes"
      if (selectedCrimeType !== 'All Crimes') {
        params.crime_type = selectedCrimeType;
      }

      // Add sorting parameter
      if (dateFilter !== 'none') {
        params.sort = 'recent';
        params.date_filter = dateFilter;
      }

      console.log('🔍 Loading crime data with params:', params);
      const geojsonData = await fetchCrimesGeoJSON(params);
      console.log('📊 Received crime data:', {
        totalFeatures: geojsonData.features.length,
        crimeTypes: [...new Set(geojsonData.features.map(f => f.properties.crime_type))],
        selectedCrimeType,
        bbox
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
      const params = {
        bbox,
        k: 25
      };

      // Add crime type filter if not "All Crimes"
      if (selectedCrimeType !== 'All Crimes') {
        params.crime_type = selectedCrimeType;
      }

      // Add sorting parameter
      if (dateFilter !== 'none') {
        params.sort = 'recent';
        params.date_filter = dateFilter;
      }

      const geojsonData = await fetchClustersGeoJSON(params);

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
      const params = {
        bbox,
        limit: 5000 // Higher limit for heatmap data
      };

      // Add crime type filter if not "All Crimes"
      if (selectedCrimeType !== 'All Crimes') {
        params.crime_type = selectedCrimeType;
      }

      // Add sorting parameter
      if (dateFilter !== 'none') {
        params.sort = 'recent';
        params.date_filter = dateFilter;
      }

      const geojsonData = await fetchCrimesGeoJSON(params);

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
    <div className="leaflet-maps-container" style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {/* Floating View Mode Controls */}
      <div className="floating-controls" style={{
        position: 'absolute',
        top: `${controlsPosition.y}px`,
        left: `${controlsPosition.x}px`,
        padding: '10px',
        background: 'rgba(248, 249, 250, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
        zIndex: 1000,
        backdropFilter: 'blur(5px)',
        pointerEvents: 'auto',
        transition: isDragging ? 'none' : 'all 0.3s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
        onMouseDown={handleMouseDown}>
        {/* Drag Handle */}
        <div style={{
          width: '100%',
          height: '20px',
          background: 'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)',
          backgroundSize: '4px 4px',
          backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px',
          borderRadius: '4px',
          marginBottom: '5px',
          opacity: 0.5,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
          onMouseDown={handleMouseDown}
        />

        {/* View Mode Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}>
          <strong style={{ color: '#333' }}>View Mode:</strong>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewModeChange('markers');
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              handleViewModeChange('clusters');
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              handleViewModeChange('heatmap');
            }}
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

        {/* Crime Type Filter Indicator */}
        {selectedCrimeType !== 'All Crimes' && (
          <div style={{
            fontSize: '12px',
            color: '#007bff',
            fontWeight: '500',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(0, 123, 255, 0.3)'
          }}>
            Filtered by: {selectedCrimeType}
          </div>
        )}

        {/* Date Filter Indicator */}
        {dateFilter !== 'none' && (
          <div style={{
            fontSize: '12px',
            color: '#28a745',
            fontWeight: '500',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(40, 167, 69, 0.3)'
          }}>
            📅 Showing: {dateFilter === '14days' ? 'Last 14 Days' :
              dateFilter === '1month' ? 'Last Month' :
                dateFilter === '6months' ? 'Last 6 Months' :
                  dateFilter === '1year' ? 'Last Year' : 'Recent crimes'}
          </div>
        )}
      </div>

      {/* Floating Title */}
      <FloatingTitle />

      {/* Fullscreen Map */}
      <div
        ref={mapContainerRef}
        id="map"
        style={{
          height: '100vh',
          width: '100vw',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
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
        {map && <RouteAnalysis
          map={map}
          selectedCrimeType={selectedCrimeType}
          onCrimeTypeChange={setSelectedCrimeType}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />}

        {/* Location Search Component - Standalone on left side */}
        {map && <Location map={map} isIntegrated={false} />}
      </div>
    </div>
  );
}

export default LeafletMaps;