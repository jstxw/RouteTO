#!/usr/bin/env python3
"""
Entry point for RouteTO API
Run from project root: python run_server.py
"""
import sys
import os

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

import uvicorn
from backend.main import app

if __name__ == "__main__":
    # Get port from environment variable (Render sets this automatically)
    port = int(os.environ.get("PORT", 8000))
    
    print("🚀 Starting RouteTO API server...")
    print(f"📍 Server running on port {port}")
    print("📚 API Documentation: /docs")
    print("🏥 Health Check: /")
    print("🔍 Crime Data: /crimes")
    
    # Production configuration
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        reload=False,  # Disable reload in production
        log_level="info"
    )
