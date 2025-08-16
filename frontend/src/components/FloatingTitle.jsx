import React from 'react';

const FloatingTitle = () => {
    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '10000px',
            padding: '10px 15px',
            background: 'rgba(248, 249, 250, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '18px' }}>RouteTO</h2>
            <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>Toronto Crime Data</p>
        </div>
    );
};

export default FloatingTitle;
