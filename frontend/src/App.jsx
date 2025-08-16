import React, { useState } from "react";
import HomePage from "./Homepage.jsx";
import "./App.css";
import LeafletMaps from "./components/LeafletMaps.jsx";

const App = () => {
  const [activePage, setActivePage] = useState("map");

  return (
    <div style={{
      margin: 0,
      padding: 0,
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <div className="toggle-bar">
        <button
          className={activePage === "home" ? "active" : ""}
          onClick={() => setActivePage("home")}
        >
          Home
        </button>
        <button
          className={activePage === "map" ? "active" : ""}
          onClick={() => setActivePage("map")}
        >
          Map
        </button>
      </div>

      {activePage === "home" && <HomePage />}
      {activePage === "map" && <LeafletMaps />}
    </div>
  );
};

export default App;
