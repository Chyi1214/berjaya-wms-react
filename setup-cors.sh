#!/bin/bash

# Firebase Storage CORS Setup Script
# This script configures CORS settings for Firebase Storage to allow image uploads from your web app

echo "🔧 Setting up CORS for Firebase Storage..."
echo ""

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil is not installed."
    echo ""
    echo "Please install Google Cloud SDK first:"
    echo "  Mac: brew install --cask google-cloud-sdk"
    echo "  Or visit: https://cloud.google.com/sdk/docs/install"
    echo ""
    exit 1
fi

# Get Firebase project ID
PROJECT_ID=$(firebase use 2>/dev/null | grep "Now using project" | awk '{print $4}')

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID="berjaya-autotech"
    echo "⚠️  Could not detect Firebase project, using default: $PROJECT_ID"
else
    echo "✅ Detected Firebase project: $PROJECT_ID"
fi

BUCKET="gs://${PROJECT_ID}.firebasestorage.app"

echo ""
echo "📦 Storage bucket: $BUCKET"
echo ""

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo "❌ cors.json file not found!"
    exit 1
fi

echo "🚀 Applying CORS configuration..."
gsutil cors set cors.json "$BUCKET"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "📋 Current CORS configuration:"
    gsutil cors get "$BUCKET"
    echo ""
    echo "🎉 Done! You can now upload images from your web app."
else
    echo ""
    echo "❌ Failed to apply CORS configuration."
    echo ""
    echo "Please make sure:"
    echo "  1. You're logged in: gcloud auth login"
    echo "  2. You have permissions for project: $PROJECT_ID"
fi
