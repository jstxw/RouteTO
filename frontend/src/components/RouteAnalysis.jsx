// Route analysis component for RouteTO - Safe route recommendations
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

const RouteAnalysis = ({ map, onRouteSelect }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [isSelectingPoints, setIsSelectingPoints] = useState(false);
  const [currentStep, setCurrentStep] = useState('start'); // 'start', 'end', 'done'
  const [analysis, setAnalysis] = useState(null);
  const routeLayersRef = useRef([]);
  const markersRef = useRef([]);

  // Clean up map layers
  const clearLayers = () => {
    routeLayersRef.current.forEach(layer => {
      if (map && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    routeLayersRef.current = [];
    
    markersRef.current.forEach(marker => {
      if (map && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    markersRef.current = [];
  };

  // Handle map clicks for point selection
  useEffect(() => {
    if (!map || !isSelectingPoints) return;

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      
      if (currentStep === 'start') {
        setStartPoint({ lat, lng });
        setCurrentStep('end');
        
        // Add start marker
        const startMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'route-marker route-start',
            html: '<div style="background: #22c55e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">S</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        });
        startMarker.addTo(map);
        markersRef.current.push(startMarker);
        
      } else if (currentStep === 'end') {
        setEndPoint({ lat, lng });
        setCurrentStep('done');
        setIsSelectingPoints(false);
        
        // Add end marker
        const endMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'route-marker route-end',
            html: '<div style="background: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">E</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        });
        endMarker.addTo(map);
        markersRef.current.push(endMarker);
      }
    };

    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, isSelectingPoints, currentStep]);

  // Start point selection
  const startPointSelection = () => {
    clearLayers();
    setStartPoint(null);
    setEndPoint(null);
    setRoutes([]);
    setAnalysis(null);
    setCurrentStep('start');
    setIsSelectingPoints(true);
  };

  // Analyze routes
  const analyzeRoutes = async () => {
    if (!startPoint || !endPoint) return;

    setIsAnalyzing(true);
    
    try {
      // Use basic OSRM routes since spatial analysis isn't available yet
      const response = await fetch(
        `http://localhost:8002/routes/osrm?start_lat=${startPoint.lat}&start_lng=${startPoint.lng}&end_lat=${endPoint.lat}&end_lng=${endPoint.lng}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        setRoutes(data.routes);
        // Set basic analysis without risk scoring
        setAnalysis({
          safest_route: 0,
          safety_improvement: null,
          analysis_note: "Basic route analysis - crime risk scoring temporarily unavailable"
        });
        displayRoutes(data.routes);
      } else {
        alert('No routes found between the selected points');
      }
      
    } catch (error) {
      console.error('Route analysis failed:', error);
      alert('Failed to analyze routes. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Display routes on map
  const displayRoutes = (routeData) => {
    clearLayers();
    
    // Re-add markers
    if (startPoint) {
      const startMarker = L.marker([startPoint.lat, startPoint.lng], {
        icon: L.divIcon({
          className: 'route-marker route-start',
          html: '<div style="background: #22c55e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">S</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });
      startMarker.addTo(map);
      markersRef.current.push(startMarker);
    }
    
    if (endPoint) {
      const endMarker = L.marker([endPoint.lat, endPoint.lng], {
        icon: L.divIcon({
          className: 'route-marker route-end',
          html: '<div style="background: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">E</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });
      endMarker.addTo(map);
      markersRef.current.push(endMarker);
    }

    // Add route lines
    routeData.forEach((route, index) => {
      if (route.geometry && route.geometry.coordinates) {
        // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
        const latlngs = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        // Color based on safety score if available
        let color = '#3b82f6'; // Default blue
        let weight = 4;
        let opacity = 0.7;
        
        if (route.risk_score !== undefined) {
          // Red for high risk, yellow for medium, green for low
          if (route.risk_score > 0.7) {
            color = '#ef4444'; // Red
          } else if (route.risk_score > 0.3) {
            color = '#f59e0b'; // Yellow
          } else {
            color = '#22c55e'; // Green
          }
        } else {
          // Different colors for different routes when no risk score
          const colors = ['#3b82f6', '#8b5cf6', '#06b6d4'];
          color = colors[index % colors.length];
        }
        
        // Highlight the safest route
        if (index === 0 && analysis && analysis.safest_route === 0) {
          weight = 6;
          opacity = 0.9;
        }

        const routeLine = L.polyline(latlngs, {
          color: color,
          weight: weight,
          opacity: opacity,
          smoothFactor: 1
        });

        // Add popup with route details
        const distance = route.distance ? `${(route.distance / 1000).toFixed(1)} km` : 'Unknown distance';
        const duration = route.duration ? `${Math.round(route.duration / 60)} min` : 'Unknown duration';
        const riskText = route.risk_score !== undefined ? `<br><strong>Risk Score:</strong> ${(route.risk_score * 100).toFixed(0)}%` : '';
        const crimeCount = route.nearby_crimes !== undefined ? `<br><strong>Nearby Crimes:</strong> ${route.nearby_crimes}` : '';
        
        routeLine.bindPopup(`
          <strong>Route ${index + 1}</strong><br>
          <strong>Distance:</strong> ${distance}<br>
          <strong>Duration:</strong> ${duration}${riskText}${crimeCount}
        `);

        routeLine.addTo(map);
        routeLayersRef.current.push(routeLine);
      }
    });

    // Fit map to show all routes
    if (routeLayersRef.current.length > 0) {
      const group = L.featureGroup(routeLayersRef.current);
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  };

  // Reset analysis
  const resetAnalysis = () => {
    clearLayers();
    setStartPoint(null);
    setEndPoint(null);
    setRoutes([]);
    setAnalysis(null);
    setCurrentStep('start');
    setIsSelectingPoints(false);
  };

  return (
    <div className="route-analysis-panel" style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      minWidth: '250px',
      maxWidth: '300px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}>
        Route Safety Analysis
      </h3>
      
      {!isSelectingPoints && !startPoint ? (
        <button
          onClick={startPointSelection}
          style={{
            width: '100%',
            padding: '10px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Select Route Points
        </button>
      ) : isSelectingPoints ? (
        <div>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
            {currentStep === 'start' ? 'Click map to select starting point' : 'Click map to select destination'}
          </p>
          <button
            onClick={() => setIsSelectingPoints(false)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          {startPoint && endPoint && (
            <div style={{ marginBottom: '15px' }}>
              <button
                onClick={analyzeRoutes}
                disabled={isAnalyzing}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: isAnalyzing ? '#9ca3af' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  marginBottom: '10px'
                }}
              >
                {isAnalyzing ? 'Analyzing Routes...' : 'Analyze Routes'}
              </button>
              
              <button
                onClick={resetAnalysis}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Reset
              </button>
            </div>
          )}
          
          {routes.length > 0 && (
            <div style={{ marginTop: '15px', fontSize: '12px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Routes Found: {routes.length}</h4>
              
              {analysis && (
                <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
                  <strong>Safest Route:</strong> Route {(analysis.safest_route || 0) + 1}
                  {analysis.safety_improvement && (
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      {(analysis.safety_improvement * 100).toFixed(0)}% safer than alternatives
                    </div>
                  )}
                </div>
              )}
              
              {routes.map((route, index) => (
                <div key={index} style={{
                  padding: '8px',
                  margin: '5px 0',
                  background: index === 0 && analysis ? '#dcfce7' : '#f9fafb',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <strong>Route {index + 1}</strong>
                  {route.distance && (
                    <div>Distance: {(route.distance / 1000).toFixed(1)} km</div>
                  )}
                  {route.duration && (
                    <div>Duration: {Math.round(route.duration / 60)} min</div>
                  )}
                  {route.risk_score !== undefined && (
                    <div style={{ color: route.risk_score > 0.5 ? '#ef4444' : '#22c55e' }}>
                      Risk: {(route.risk_score * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteAnalysis;
