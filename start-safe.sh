#!/bin/bash

# YC Vibecon Safe Startup Script
# Prevents webpack/turbopack conflicts and zombie processes
# Ensures clean development server starts on port 3000

set -e

echo "🏄‍♂️ Vibecon Safe Startup - Preventing build conflicts..."

# Parse command line arguments
FORCE_CLEAN=false
USE_TURBO=false
for arg in "$@"; do
    case $arg in
        --clean)
            FORCE_CLEAN=true
            shift
            ;;
        --turbo)
            USE_TURBO=true
            shift
            ;;
    esac
done

echo "🔍 Checking for existing Next.js processes..."

# Kill any existing Next.js processes for this project (yc-vibecon)
EXISTING_PROCESSES=$(ps aux | grep "yc-vibecon.*next" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$EXISTING_PROCESSES" ]; then
    echo "⚠️  Found existing Next.js processes: $EXISTING_PROCESSES"
    echo "🧹 Cleaning up existing processes..."
    echo "$EXISTING_PROCESSES" | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Check if port 3000 is in use and kill it
echo "🔍 Checking port 3000..."
if lsof -i :3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is in use. Killing process..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Also check common alternative ports that might conflict
for port in 3001 3002 3006; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "ℹ️  Port $port is also in use, cleaning up..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
    fi
done

# Clean build artifacts to prevent webpack/turbopack conflicts
echo "🧹 Cleaning build artifacts..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .swc 2>/dev/null || true

# Clean additional cache that can cause conflicts
if [ "$FORCE_CLEAN" = true ]; then
    echo "🧹 Deep cleaning (--clean flag used)..."
    rm -rf node_modules 2>/dev/null || true
    echo "📦 Reinstalling dependencies..."
    npm install
fi

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if package.json has turbo flag and warn about conflicts
if grep -q "\"dev\":.*--turbo" package.json && [ ! -f "turbo.json" ]; then
    echo "⚠️  Detected Turbopack in dev script but webpack config present!"
    echo "   This causes the ENOENT build-manifest.json errors you've been seeing."

    if [ "$USE_TURBO" = true ]; then
        echo "🚀 Starting with Turbopack (--turbo flag used)"
        echo "   Note: Webpack config in next.config.js will be ignored"
        export NEXT_FLAGS="--turbo"
    else
        echo "🔧 Starting with webpack (safer for this config)"
        echo "   Use --turbo flag if you want to force Turbopack"
        export NEXT_FLAGS=""
    fi
else
    export NEXT_FLAGS=""
fi

# Set environment variable to ensure port 3000
export PORT=3000

echo ""
echo "🎯 Configuration:"
echo "   Port: 3000"
echo "   Build system: $([ "$USE_TURBO" = true ] && echo "Turbopack" || echo "Webpack")"
echo "   Clean build: $([ "$FORCE_CLEAN" = true ] && echo "Yes" || echo "No")"
echo ""

echo "🚀 Starting Next.js development server on port 3000..."

# Use npm to respect package.json scripts but override with our settings
if [ "$USE_TURBO" = true ]; then
    exec npm run dev -- --port 3000 --turbo
else
    # Remove turbo flag if it exists and force webpack
    exec npx next dev --port 3000
fi