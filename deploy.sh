#!/bin/bash

echo "🚀 Deploying RouteTO Application..."

# Build and start containers
echo "📦 Building Docker containers..."
docker-compose build

echo "🏃 Starting services..."
docker-compose up -d

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"

# Show running containers
echo "📋 Running containers:"
docker-compose ps
