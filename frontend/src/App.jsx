import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

import './App.css'
import 'leaflet/dist/leaflet.css';

import LeafletMaps from './components/LeafletMaps';

function App() {
  return (
    <div style={{
      margin: 0,
      padding: 0,
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <LeafletMaps />
    </div>
  );
}

export default App;