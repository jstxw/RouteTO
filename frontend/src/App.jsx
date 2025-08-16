import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import 'leaflet/dist/leaflet.css';

import LeafletMaps from './components/LeafletMaps';
import Nav from './components/Nav';
import HomePage from './HomePage';

const App = () => {
  return (
    <Router>
      <div style={{
        margin: 0,
        padding: 0,
        height: '100vh',
        width: '100vw',
        overflow: 'hidden'
      }}>
        <Routes>
          <Route path="/" element={
            <div>
              <Nav />
              <HomePage />
            </div>
          } />
          <Route path="/map" element={
            <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
              <Nav />
              <LeafletMaps />
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
