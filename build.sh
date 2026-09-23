#!/usr/bin/env bash
set -e

echo "=== Installing Node.js dependencies ==="
npm install

echo "=== Installing Python dependencies (yt-dlp) ==="
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "=== Build Complete ==="