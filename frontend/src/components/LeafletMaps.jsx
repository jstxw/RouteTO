import { useEffect } from 'react';
import L from 'leaflet';

function LeafletMaps() {
  useEffect(() => {
    // Initialize the map
    const map = L.map('map').setView([37.7749, -122.4194], 10); // San Francisco coordinates

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Add a marker
    L.marker([37.7749, -122.4194])
      .addTo(map)
      .bindPopup('San Francisco')
      .openPopup();
  }, []);

  return <div id="map" style={{ width: '100%', height: '500px' }}></div>;
}

export default LeafletMaps;