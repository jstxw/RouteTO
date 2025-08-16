#!/bin/bash
# Install leaflet.heat plugin and run the frontend

echo "🔥 Setting up RouteTO with Heatmap functionality..."

cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🔥 Installing leaflet.heat plugin..."
npm install leaflet.heat

echo "🚀 Starting frontend development server..."
echo "   Frontend will be available at http://localhost:5173"
echo "   Make sure your backend is running at http://localhost:8000"
echo ""

npm run dev
