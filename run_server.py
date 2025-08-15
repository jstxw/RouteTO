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
    print("🚀 Starting RouteTO API server...")
    print("📍 API Documentation: http://localhost:8000/docs")
    print("🏥 Health Check: http://localhost:8000/")
    print("🔍 Crime Data: http://localhost:8000/crimes")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
