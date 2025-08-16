import React, { useState } from "react";
import "../index.css";

const Forms = () => {
  const [start, setStart] = useState("");
  const [destination, setDestination] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Starting Point:", start);
    console.log("Destination:", destination);
  };

  return (
    
        <form className="route-form" onSubmit={handleSubmit}>
        <input
            type="text"
            placeholder="Enter your starting point"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
        />
        <input
            type="text"
            className="destination-input"
            placeholder="Enter your destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
        />

      <button className="btn" type="submit">Find the Safest Route</button>
    </form>

  );
};

export default Forms;
