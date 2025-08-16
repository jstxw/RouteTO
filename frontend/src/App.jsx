import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

import './App.css'
import 'leaflet/dist/leaflet.css';

import LeafletMaps from './components/LeafletMaps';
import Nav from './components/Nav';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <div style={{
      margin: 0,
      padding: 0,
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <Nav />
      <div style={{
        marginTop: '60px', // Account for fixed navbar height
        height: 'calc(100vh - 60px)',
        width: '100vw'
      }}>
        <LeafletMaps />
      </div>
    </div>
  );
}

export default App;