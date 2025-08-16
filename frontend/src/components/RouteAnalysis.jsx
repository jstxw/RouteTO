// Route analysis component for RouteTO - Safe route recommendations
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

const RouteAnalysis = ({ map, selectedCrimeType, onCrimeTypeChange, sortByRecency, onSortByRecencyChange, onRouteSelect }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [routes, setRoutes] = useState([]);
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);
    const [isSelectingPoints, setIsSelectingPoints] = useState(false);
    const [currentStep, setCurrentStep] = useState('start'); // 'start', 'end', 'done'
    const [analysis, setAnalysis] = useState(null);
    const [panelPosition, setPanelPosition] = useState({ x: window.innerWidth - 310, y: 70 }); // Start at right edge
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const routeLayersRef = useRef([]);
    const markersRef = useRef([]);

    // Available crime types from Toronto data
    const crimeTypes = [
        'All Crimes',
        'Assault',
        'Auto Theft',
        'Break and Enter',
        'Robbery',
        'Theft Over'
    ];

    // Handle drag events for the panel
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - panelPosition.x,
            y: e.clientY - panelPosition.y
        });
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        // Keep panel within viewport bounds
        const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragStart.x));
        const newY = Math.max(60, Math.min(window.innerHeight - 100, e.clientY - dragStart.y));
        
        setPanelPosition({
            x: newX,
            y: newY
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
    }, [isDragging, dragStart, panelPosition]);

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
            // Try full route analysis with crime risk scoring first
            let response;
            try {
                const crimeTypeParam = selectedCrimeType === 'All Crimes' ? '' : `&crime_type=${encodeURIComponent(selectedCrimeType)}`;
                const sortParam = sortByRecency ? '&sort=recent' : '';
                response = await fetch(
                    `http://localhost:8002/routes/analyze?start_lat=${startPoint.lat}&start_lng=${startPoint.lng}&end_lat=${endPoint.lat}&end_lng=${endPoint.lng}&buffer_m=50${crimeTypeParam}${sortParam}`
                );
            } catch (error) {
                // Fallback to basic OSRM routes if analysis fails
                console.log('Full analysis failed, using basic routes:', error);
                response = await fetch(
                    `http://localhost:8002/routes/osrm?start_lat=${startPoint.lat}&start_lng=${startPoint.lng}&end_lat=${endPoint.lat}&end_lng=${endPoint.lng}`
                );
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Handle different response structures
            let routesData = data;
            if (data.routes && Array.isArray(data.routes)) {
                // Full analysis response structure
                routesData = data.routes;
            } else if (!Array.isArray(data)) {
                // Single route or other structure
                routesData = [data];
            }

            if (routesData && routesData.length > 0) {
                // Create route information with safety analysis
                const routeInfo = routesData.map((route, index) => {
                    // Handle both analysis structure and direct route structure
                    const analysis = route.analysis || {};
                    const geometry = route.geometry || route;
                    const osrmData = route.osrm_data || route;

                    const riskScore = analysis.score || route.risk_score || 0;
                    const crimesDensity = analysis.score || route.crimes_per_km || 0; // risk score is crimes per km in our system

                    return {
                        id: index,
                        geometry: geometry.geometry || geometry,
                        distance: osrmData.distance_meters || osrmData.distance || 0,
                        duration: osrmData.duration_seconds || osrmData.duration || 0,
                        riskScore: riskScore,
                        crimesDensity: crimesDensity,
                        safetyRating: Math.max(0, 100 - (crimesDensity / 10)), // Convert to 0-100 scale
                        isSafest: index === 0, // Routes are sorted by safety (lowest risk first)
                        nearbyIncidents: analysis.incidents || route.nearby_crimes || 0
                    };
                });

                setRoutes(routeInfo);

                // Set analysis results
                const comparison = data.comparison || {};
                setAnalysis({
                    safest_route: comparison.safest_route_id || 0,
                    safety_improvement: routeInfo.length > 1 ?
                        ((routeInfo[1].crimesDensity - routeInfo[0].crimesDensity) / routeInfo[1].crimesDensity * 100).toFixed(1) :
                        null,
                    analysis_note: `Crime risk analysis complete. ${routeInfo.length} route(s) analyzed with ${routeInfo[0]?.nearbyIncidents || 0} nearby incidents.`
                });

                displayRoutes(routeInfo);
            } else if (data.routes && data.routes.length > 0) {
                // Fallback for basic OSRM response
                setRoutes(data.routes);
                setAnalysis({
                    safest_route: 0,
                    safety_improvement: null,
                    analysis_note: "Basic route analysis - using fallback routing"
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

                // Color based on crime density if available
                let color = '#3b82f6'; // Default blue
                let weight = 4;
                let opacity = 0.7;

                if (route.crimesDensity !== undefined) {
                    // Red for high crime density, yellow for medium, green for low
                    if (route.crimesDensity > 500) {
                        color = '#ef4444'; // Red - high crime
                    } else if (route.crimesDensity > 200) {
                        color = '#f59e0b'; // Yellow - medium crime
                    } else {
                        color = '#22c55e'; // Green - low crime
                    }
                } else if (route.risk_score !== undefined) {
                    // Fallback to risk score if available
                    if (route.risk_score > 0.7) {
                        color = '#ef4444'; // Red
                    } else if (route.risk_score > 0.3) {
                        color = '#f59e0b'; // Yellow
                    } else {
                        color = '#22c55e'; // Green
                    }
                } else {
                    // Different colors for different routes when no risk data
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
                const crimeText = route.crimesDensity !== undefined ? `<br><strong>Crime Density:</strong> ${route.crimesDensity.toFixed(1)} crimes/km` : '';
                const incidentText = route.nearbyIncidents !== undefined ? `<br><strong>Nearby Incidents:</strong> ${route.nearbyIncidents}` : '';
                const riskText = route.risk_score !== undefined ? `<br><strong>Risk Score:</strong> ${(route.risk_score * 100).toFixed(0)}%` : '';
                const safetyNote = index === 0 ? '<br><span style="color: green;"><strong>🛡️ SAFEST ROUTE</strong></span>' : '';

                routeLine.bindPopup(`
          <strong>Route ${index + 1}</strong><br>
          <strong>Distance:</strong> ${distance}<br>
          <strong>Duration:</strong> ${duration}${crimeText}${incidentText}${riskText}${safetyNote}
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
            top: `${panelPosition.y}px`,
            left: `${panelPosition.x}px`,
            background: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '250px',
            maxWidth: '300px',
            height: 'fit-content', // Dynamic height based on content
            transition: isDragging ? 'none' : 'all 0.3s ease',
            cursor: isDragging ? 'grabbing' : 'default',
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
                marginBottom: '10px',
                opacity: 0.5,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            />
            
            {/* Map */}
            {/* RouteTO Title */}
            <div style={{
                textAlign: 'center',
                marginBottom: '15px',
                padding: '0 0 8px 0',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <h2 style={{
                    margin: '0 0 10px 0',
                    color: '#3b82f6',
                    fontSize: '20px',
                    fontWeight: 'bold'
                }}>
                    RouteTO
                </h2>

                {/* Recency Dropdown */}
                <div style={{ marginTop: '8px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginBottom: '5px',
                        color: '#374151',
                        textAlign: 'left'
                    }}>
                        Filter by Crime Date:
                    </label>
                    <select
                        value={sortByRecency ? 'recent' : 'none'}
                        onChange={(e) => onSortByRecencyChange(e.target.value === 'recent')}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: 'white',
                            color: '#374151',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="none">All Crimes</option>
                        <option value="recent">Last 14 Days</option>
                        <option value="recent">Last Month</option>
                        <option value="recent">Last Six Months</option>
                        <option value="recent">Last Year</option>

                    </select>
                </div>
            </div>

            {/* Crime Type Filter */}
            <div style={{ marginBottom: '15px' }}>
                <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '500',
                    marginBottom: '5px',
                    color: '#374151'
                }}>
                    Filter by Crime Type:
                </label>
                <select
                    value={selectedCrimeType}
                    onChange={(e) => onCrimeTypeChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: 'white',
                        color: '#374151'
                    }}
                >
                    {crimeTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {!isSelectingPoints && !startPoint ? (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        startPointSelection();
                    }}
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
                    <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.2', marginBottom: '4px' }}>
                        {currentStep === 'start' ? 'Click map to select starting point' : 'Click map to select destination'}
                    </p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsSelectingPoints(false);
                        }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    analyzeRoutes();
                                }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetAnalysis();
                                }}
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
                            {routes.map((route, index) => (
                                <div key={index} style={{
                                    padding: '8px',
                                    margin: '5px 0',
                                    background: index === 0 && analysis ? '#dcfce7' : '#f9fafb',
                                    borderRadius: '4px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <strong style={{ color: '#1f2937', fontSize: '14px' }}>Route {index + 1}</strong>
                                    {index === 0 && analysis && (
                                        <span style={{ color: '#22c55e', marginLeft: '8px' }}>🛡️ SAFEST</span>
                                    )}
                                    {route.distance && (
                                        <div style={{ color: '#374151', fontWeight: '500', fontSize: '13px' }}>
                                            Distance: <span style={{ fontWeight: 'bold' }}>{(route.distance / 1000).toFixed(1)} km</span>
                                        </div>
                                    )}
                                    {route.duration && (
                                        <div style={{ color: '#374151', fontWeight: '500', fontSize: '13px' }}>
                                            Duration: <span style={{ fontWeight: 'bold' }}>{Math.round(route.duration / 60)} min</span>
                                        </div>
                                    )}
                                    {route.crimesDensity !== undefined && (
                                        <div style={{
                                            color: route.crimesDensity > 500 ? '#ef4444' :
                                                route.crimesDensity > 200 ? '#f59e0b' : '#22c55e',
                                            fontWeight: 'bold',
                                            fontSize: '13px'
                                        }}>
                                            Crime Density: <span style={{ fontSize: '14px' }}>{route.crimesDensity.toFixed(1)}</span> crimes/km
                                        </div>
                                    )}
                                    {route.nearbyIncidents !== undefined && (
                                        <div style={{
                                            color: '#6b7280',
                                            fontWeight: 'bold',
                                            fontSize: '13px'
                                        }}>
                                            Nearby Incidents: <span style={{ fontSize: '14px' }}>{route.nearbyIncidents}</span>
                                        </div>
                                    )}
                                    {route.safetyRating !== undefined && (
                                        <div style={{
                                            color: route.safetyRating > 70 ? '#22c55e' : '#f59e0b',
                                            fontWeight: 'bold',
                                            fontSize: '13px'
                                        }}>
                                            Safety Rating: <span style={{ fontSize: '14px' }}>{route.safetyRating.toFixed(0)}%</span>
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
