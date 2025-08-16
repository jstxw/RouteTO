#!/usr/bin/env python3
"""
Simple startup script for RouteTO API
"""
import sys
import os

# Add backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# Now import and run
try:
    import uvicorn
    
    print("🚀 Starting RouteTO API server...")
    print("📍 API Documentation: http://localhost:8000/docs")
    print("🏥 Health Check: http://localhost:8000/")
    
    # Use string import to enable reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure you're in the project root directory")
    print("💡 Try: cd /Users/jstwx07/Desktop/projects/RouteTO && python start.py")
except Exception as e:
    print(f"❌ Error starting server: {e}")
