import React, { useState, useRef, useEffect } from "react";
import "./HomePage.css";
import { useNavigate } from 'react-router-dom';
import routeToLogo from './assets/RouteTO__3_-removebg-preview_1.png';

const HomePage = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef(null);

  // Tech stack component state
  const [isTechDragging, setIsTechDragging] = useState(false);
  const [techDragStart, setTechDragStart] = useState({ x: 0, y: 0 });
  const [techPosition, setTechPosition] = useState({ x: 0, y: 0 });
  const techRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Constrain the movement within viewport bounds
    const maxX = window.innerWidth - (contentRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (contentRef.current?.offsetHeight || 0);

    setPosition({
      x: Math.max(-maxX / 2, Math.min(maxX / 2, newX)),
      y: Math.max(-200, Math.min(200, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Tech stack drag handlers
  const handleTechMouseDown = (e) => {
    e.stopPropagation(); // Prevent main container drag
    setIsTechDragging(true);
    setTechDragStart({
      x: e.clientX - techPosition.x,
      y: e.clientY - techPosition.y
    });
  };

  const handleTechMouseMove = (e) => {
    if (!isTechDragging) return;

    const newX = e.clientX - techDragStart.x;
    const newY = e.clientY - techDragStart.y;

    // Constrain the movement within viewport bounds
    const maxX = window.innerWidth - (techRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (techRef.current?.offsetHeight || 0);

    setTechPosition({
      x: Math.max(-maxX / 2, Math.min(maxX / 2, newX)),
      y: Math.max(-300, Math.min(300, newY))
    });
  };

  const handleTechMouseUp = () => {
    setIsTechDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isTechDragging) {
      document.addEventListener('mousemove', handleTechMouseMove);
      document.addEventListener('mouseup', handleTechMouseUp);
    } else {
      document.removeEventListener('mousemove', handleTechMouseMove);
      document.removeEventListener('mouseup', handleTechMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleTechMouseMove);
      document.removeEventListener('mouseup', handleTechMouseUp);
    };
  }, [isTechDragging, techDragStart]);

  return (
    <div className="homepage-container">
      {/* Fixed Background */}
      <div className="background-image"></div>

      {/* Navigation Header */}
      <nav className="homepage-nav">
        <div className="nav-brand">
          <img src={routeToLogo} alt="RouteTO" className="brand-logo" />
          <div className="nav-tagline">
            "Navigate with Confidence"
          </div>
        </div>
        <div className="nav-actions">
          <button className="home-page-btn" onClick={() => navigate('/')}>
            Home Page
          </button>
          <button className="try-routeto-btn" onClick={() => navigate('/map')}>
            Map
          </button>
        </div>
      </nav>

      {/* Scrollable Content Container */}
      <div
        ref={contentRef}
        className="content-container"
        style={{
          transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Drag Handle */}
        <div className="drag-handle">
          <div className="drag-indicator"></div>
          <span className="drag-text">Drag to move</span>
        </div>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            🛡️ Toronto's Safety-First Navigation
          </div>
          <h1 className="hero-title">
            Navigate Toronto<br />
            <span className="hero-title-highlight">Safely & Smartly</span>
          </h1>
          <p className="hero-description">
            RouteTO helps you plan the safest walking routes through Toronto using real-time crime data and community insights. Walk with confidence, every step of the way.
          </p>
          <div className="hero-actions">
            <button className="start-navigation-btn" onClick={() => navigate('/map')}>
              Start Safe Navigation →
            </button>
            <button className="view-map-btn" onClick={() => navigate('/map')}>
              📍 View Live Map
            </button>
          </div>
          <div className="feature-badges">
            <div className="badge">
              <span className="badge-dot green"></span>
              Real-time Crime Data
            </div>
            <div className="badge">
              <span className="badge-dot orange"></span>
              Community Verified
            </div>
            <div className="badge">
              <span className="badge-dot blue"></span>
              Always Updated
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <h2>Why Choose RouteTO?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>Smart Route Planning</h3>
              <p>Get multiple route options with safety scores based on real crime data</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Data</h3>
              <p>Access up-to-date crime statistics from Toronto Police Service</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Safety First</h3>
              <p>Prioritize well-lit, populated routes for maximum security</p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="how-it-works-section">
          <h2>How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Enter Your Destination</h3>
              <p>Input where you want to go or select a point on the map</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get Safety Analysis</h3>
              <p>Our algorithm analyzes crime data to find the safest routes</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Navigate Confidently</h3>
              <p>Follow the recommended route with real-time safety updates</p>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="about-section">
          <h2>About RouteTO</h2>
          <p>
            Built for Toronto residents and visitors, RouteTO combines official crime data
            with advanced mapping technology to help you navigate the city safely. Our mission
            is to empower everyone to explore Toronto with confidence.
          </p>
          <div className="cta-section">
            <h3>Ready to Navigate Safely?</h3>
            <button className="cta-button" onClick={() => navigate('/map')}>
              Start Using RouteTO
            </button>
          </div>
        </section>

        {/* Call to Action Section with Statistics */}
        <section className="blue-cta-section">
          <div className="shield-icon">🛡️</div>
          <h2 className="cta-title">Start Your Safe Journey Today</h2>
          <p className="cta-description">
            Join thousands of Toronto residents who trust RouteTO to navigate the city
            safely. Your peace of mind is just one click away.
          </p>
          <div className="cta-buttons">
            <button className="launch-map-btn" onClick={() => navigate('/map')}>
              Launch RouteTO Map →
            </button>
            <button className="secondary-cta-btn">
              Learn More
            </button>
          </div>
          <div className="statistics-grid">
            <div className="stat-item">
              <div className="stat-number">10,000+</div>
              <div className="stat-label">Safe Routes Planned</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">95%</div>
              <div className="stat-label">User Satisfaction</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Real-Time Updates</div>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="footer-section">
          <div className="footer-content">
            <div className="footer-column">
              <div className="footer-brand">
                <div className="footer-logo">
                  <span className="logo-icon">🛡️</span>
                  <span className="brand-name">RouteTO</span>
                </div>
                <p className="footer-description">
                  Helping Toronto residents navigate the city safely with real-time crime data and smart route planning.
                </p>
                <div className="social-links">
                  <a href="#" className="social-link" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </a>
                  <a href="#" className="social-link" aria-label="GitHub">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                  <a href="#" className="social-link" aria-label="Email">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 4.557c-0.883 0.392-1.832 0.656-2.828 0.775 1.017-0.609 1.798-1.574 2.165-2.724-0.951 0.564-2.005 0.974-3.127 1.195-0.897-0.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-0.205-7.719-2.165-10.148-5.144-1.29 2.213-0.669 5.108 1.523 6.574-0.806-0.026-1.566-0.247-2.229-0.616-0.054 2.281 1.581 4.415 3.949 4.89-0.693 0.188-1.452 0.232-2.224 0.084 0.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646 0.962-0.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="footer-column">
              <h3 className="footer-heading">Product</h3>
              <ul className="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How it Works</a></li>
                <li><a href="#safety-data">Safety Data</a></li>
                <li><a href="#api-access">API Access</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h3 className="footer-heading">Company</h3>
              <ul className="footer-links">
                <li><a href="#about">About Us</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h3 className="footer-heading">Support</h3>
              <ul className="footer-links">
                <li><a href="#help">Help Center</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
                <li><a href="#report">Report Issue</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <p className="copyright">© 2024 RouteTO. All rights reserved.</p>
              <p className="footer-tagline">Built with safety in mind for Toronto residents.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Technology Stack Draggable Component */}
      <div
        ref={techRef}
        className="tech-stack-container"
        style={{
          transform: `translate(calc(-50% + ${techPosition.x}px), ${techPosition.y}px)`,
          cursor: isTechDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleTechMouseDown}
      >
        {/* Tech Stack Drag Handle */}
        <div className="tech-drag-handle">
          <div className="drag-indicator"></div>
          <span className="drag-text">Tech Stack</span>
        </div>

        <div className="tech-content">
          <div className="tech-header">
            <div className="tech-icon">⚡</div>
            <h2>Built with Modern Technology</h2>
            <p>Discover the powerful tech stack that makes RouteTO fast, reliable, and secure</p>
          </div>

          <div className="tech-sections">
            {/* Frontend Technologies */}
            <div className="tech-section">
              <h3>🎨 Frontend</h3>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-logo">⚛️</span>
                  <div>
                    <strong>React 19</strong>
                    <p>Modern UI framework with hooks</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">🗺️</span>
                  <div>
                    <strong>Leaflet</strong>
                    <p>Interactive maps & visualization</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">⚡</span>
                  <div>
                    <strong>Vite</strong>
                    <p>Lightning-fast build tool</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">🎯</span>
                  <div>
                    <strong>React Router</strong>
                    <p>Client-side navigation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Backend Technologies */}
            <div className="tech-section">
              <h3>🔧 Backend</h3>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-logo">🐍</span>
                  <div>
                    <strong>FastAPI</strong>
                    <p>High-performance Python API</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">🦄</span>
                  <div>
                    <strong>Uvicorn</strong>
                    <p>ASGI server for production</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">📊</span>
                  <div>
                    <strong>Pandas</strong>
                    <p>Data analysis & processing</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">🤖</span>
                  <div>
                    <strong>Scikit-learn</strong>
                    <p>Machine learning algorithms</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data & Infrastructure */}
            <div className="tech-section">
              <h3>🏗️ Infrastructure</h3>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-logo">🐳</span>
                  <div>
                    <strong>Docker</strong>
                    <p>Containerized deployment</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">🌐</span>
                  <div>
                    <strong>CORS</strong>
                    <p>Cross-origin resource sharing</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">🔍</span>
                  <div>
                    <strong>NumPy</strong>
                    <p>Numerical computing</p>
                  </div>
                </div>
                <div className="tech-item">
                  <span className="tech-logo">📐</span>
                  <div>
                    <strong>Shapely & PyProj</strong>
                    <p>Geospatial data processing</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Features */}
            <div className="tech-section">
              <h3>🚀 Performance</h3>
              <div className="performance-features">
                <div className="performance-item">
                  <div className="performance-metric">
                    <span className="metric-value">&lt;100ms</span>
                    <span className="metric-label">API Response Time</span>
                  </div>
                </div>
                <div className="performance-item">
                  <div className="performance-metric">
                    <span className="metric-value">Real-time</span>
                    <span className="metric-label">Crime Data Updates</span>
                  </div>
                </div>
                <div className="performance-item">
                  <div className="performance-metric">
                    <span className="metric-value">99.9%</span>
                    <span className="metric-label">Uptime Reliability</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="tech-footer">
            <p>Open source and built for the Toronto community</p>
            <a href="https://github.com/jstxw/RouteTO" className="github-link">
              <span>👨‍💻</span> View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
