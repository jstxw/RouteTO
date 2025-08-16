// Location search component for RouteTO - Address search and map navigation
import React, { useState } from 'react';

const Location = ({ map, isIntegrated = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [error, setError] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Search for addresses using Nominatim (OpenStreetMap) geocoding
    const searchAddress = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            // Focus on Toronto area by adding bias
            const torontoBounds = 'viewbox=-79.639219,43.580952,-79.115219,43.855952&bounded=1';
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}, Toronto, Ontario, Canada&limit=5&${torontoBounds}&addressdetails=1`
            );

            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }

            const results = await response.json();
            setSearchResults(results);
        } catch (error) {
            console.error('Geocoding error:', error);
            setError('Unable to search addresses. Please try again.');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search input with debouncing
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        // Simple debouncing - wait 500ms after user stops typing
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            searchAddress(query);
        }, 500);
    };

    // Zoom to selected location
    const zoomToLocation = (result) => {
        if (!map || !result) return;

        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        // Set appropriate zoom level based on place type
        let zoomLevel = 16; // Default for addresses
        if (result.type === 'city' || result.type === 'town') {
            zoomLevel = 12;
        } else if (result.type === 'suburb' || result.type === 'neighbourhood') {
            zoomLevel = 14;
        } else if (result.type === 'building' || result.type === 'house') {
            zoomLevel = 18;
        }

        // Smooth zoom to location
        map.setView([lat, lon], zoomLevel, {
            animate: true,
            duration: 1.0
        });

        setSelectedResult(result);
        setSearchResults([]);
        setSearchQuery(result.display_name.split(',')[0]); // Show just the main address
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedResult(null);
        setError(null);
    };

    // Get user's current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser.');
            return;
        }

        setIsGettingLocation(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                if (map) {
                    // Zoom to current location
                    map.setView([latitude, longitude], 16, {
                        animate: true,
                        duration: 1.0
                    });

                    // Set as selected result
                    setSelectedResult({
                        display_name: `Your Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
                    });
                    setSearchQuery('Current Location');
                    setSearchResults([]);
                }
                setIsGettingLocation(false);
            },
            (error) => {
                setIsGettingLocation(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setError('Location access denied. Please enable location permissions.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setError('Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        setError('Location request timed out.');
                        break;
                    default:
                        setError('An unknown error occurred while getting location.');
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    // Format display name for results
    const formatDisplayName = (displayName) => {
        const parts = displayName.split(',');
        return parts.slice(0, 3).join(','); // Show first 3 parts (address, area, city)
    };

    return (
        <>
            {/* CSS for spinner animation */}
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>

            <div className="location-search-panel" style={{
                position: 'absolute',
                top: '200px', // Position under the view mode controls
                left: '10px', // Pin to the left side of the page
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '250px',
                maxWidth: '300px',
                height: 'fit-content',
                transition: 'all 0.3s ease'
            }}>
                {/* Search Title */}
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
                    }}>Location Search</h2>
                </div>

                {/* Search Input */}
                <div style={{ marginBottom: '15px', position: 'relative' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginBottom: '5px',
                        color: '#374151'
                    }}>
                        Search Address:
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Enter Toronto address..."
                            style={{
                                width: '100%',
                                padding: '8px 32px 8px 8px',
                                fontSize: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                background: 'white',
                                color: '#374151',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            onFocus={() => setError(null)}
                        />
                        {isSearching ? (
                            <div style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#3b82f6',
                                fontSize: '12px',
                                fontWeight: '500'
                            }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    border: '2px solid #e5e7eb',
                                    borderTop: '2px solid #3b82f6',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                <span>Searching...</span>
                            </div>
                        ) : searchQuery && (
                            <button
                                onClick={clearSearch}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    padding: '2px'
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '8px',
                        marginBottom: '10px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        color: '#dc2626',
                        fontSize: '12px'
                    }}>
                        {error}
                    </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div style={{
                        marginBottom: '15px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            marginBottom: '5px',
                            color: '#374151'
                        }}>
                            Search Results:
                        </div>
                        {searchResults.map((result, index) => (
                            <div
                                key={index}
                                onClick={() => zoomToLocation(result)}
                                style={{
                                    padding: '8px',
                                    margin: '2px 0',
                                    background: '#f9fafb',
                                    borderRadius: '4px',
                                    border: '1px solid #e5e7eb',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.background = '#e5e7eb';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.background = '#f9fafb';
                                }}
                            >
                                <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                    {formatDisplayName(result.display_name)}
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                                    {result.type} • {result.class}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Selected Location */}
                {selectedResult && (
                    <div style={{
                        padding: '8px',
                        background: '#dcfce7',
                        borderRadius: '4px',
                        border: '1px solid #bbf7d0',
                        fontSize: '12px'
                    }}>
                        <div style={{ fontWeight: '500', color: '#166534', marginBottom: '4px' }}>
                            📍 Current Location:
                        </div>
                        <div style={{ color: '#166534' }}>
                            {formatDisplayName(selectedResult.display_name)}
                        </div>
                        <button
                            onClick={clearSearch}
                            style={{
                                marginTop: '6px',
                                padding: '4px 8px',
                                background: '#22c55e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '11px'
                            }}
                        >
                            Clear
                        </button>
                    </div>
                )}

                {/* Quick Location Buttons */}
                <div style={{ marginTop: '15px' }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        color: '#374151'
                    }}>
                        Quick Locations:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button
                            onClick={getCurrentLocation}
                            disabled={isGettingLocation}
                            style={{
                                padding: '8px 12px',
                                background: isGettingLocation ? '#f9fafb' : '#10b981',
                                border: '1px solid #10b981',
                                borderRadius: '6px',
                                cursor: isGettingLocation ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: isGettingLocation ? '#9ca3af' : 'white',
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            {isGettingLocation ? (
                                <>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        border: '2px solid #9ca3af',
                                        borderTop: '2px solid transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    Getting Location...
                                </>
                            ) : (
                                <>
                                    <span style={{ fontSize: '14px' }}>📍</span>
                                    See Current Location
                                </>
                            )}
                        </button>
                        {[
                            { name: 'Downtown Toronto', coords: [43.6532, -79.3832], zoom: 14 },
                            { name: 'CN Tower', coords: [43.6426, -79.3871], zoom: 16 },
                            { name: 'University of Toronto', coords: [43.6629, -79.3957], zoom: 15 },
                            { name: 'Toronto Pearson Airport', coords: [43.6777, -79.6248], zoom: 13 }
                        ].map((location, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    if (map) {
                                        map.setView(location.coords, location.zoom, {
                                            animate: true,
                                            duration: 1.0
                                        });
                                        setSelectedResult({ display_name: location.name });
                                        setSearchQuery(location.name);
                                        setSearchResults([]);
                                    }
                                }}
                                style={{
                                    padding: '6px 8px',
                                    background: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    color: '#374151',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.background = '#e5e7eb';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.background = '#f3f4f6';
                                }}
                            >
                                {location.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Location;
