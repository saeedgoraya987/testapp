#!/bin/bash
echo "========================================="
echo "  🚀 Open Swap Server"
echo "========================================="
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Start server
echo "🔄 Starting server..."
node server.js
