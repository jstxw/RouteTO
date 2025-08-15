#!/usr/bin/env python3
"""
RouteTO API Server Startup Script
Automatically finds an available port and starts the FastAPI server
"""
import sys
import os
import socket
import uvicorn

# Add backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

def get_free_port():
    """Find an available port on the system"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

def start_server():
    """Start the RouteTO API server"""
    try:
        # Import the FastAPI app
        from main import app
        
        # Find an available port
        port = get_free_port()
        
        print("🚀 Starting RouteTO API Server...")
        print(f"📍 Server URL: http://localhost:{port}")
        print(f"📚 API Documentation: http://localhost:{port}/docs")
        print(f"🏥 Health Check: http://localhost:{port}/health")
        print(f"🔍 Crime Data: http://localhost:{port}/crimes")
        print("📊 Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Start the server with auto-reload for development
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("💡 Make sure you're in the RouteTO project directory")
        print("💡 Try: cd /Users/jstwx07/Desktop/projects/RouteTO")
        return False
        
    except Exception as e:
        print(f"❌ Server Error: {e}")
        return False

if __name__ == "__main__":
    start_server()
