import React from 'react';
import { useNavigate } from 'react-router-dom';
import routeToLogo from '../assets/RouteTO__3_-removebg-preview_1.png';

const Nav = () => {
    const navigate = useNavigate();

    return (
        <nav style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            zIndex: 20000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <img
                    src={routeToLogo}
                    alt="RouteTO"
                    style={{
                        height: '50px',
                        width: 'auto',
                        objectFit: 'contain'
                    }}
                />
                <div style={{
                    fontSize: '14px',
                    color: '#00050eff',
                    fontStyle: 'italic',
                    fontWeight: '1000',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    "Navigate with Confidence"
                </div>
            </div>

            <div style={{
                display: 'flex',
                gap: '15px'
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#2563eb'}
                    onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                >
                    Home Page
                </button>

                <button
                    onClick={() => navigate('/map')}
                    style={{
                        padding: '8px 16px',
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#16a34a'}
                    onMouseOut={(e) => e.target.style.background = '#22c55e'}
                >
                    Map
                </button>
            </div>
        </nav>
    );
};

export default Nav;
