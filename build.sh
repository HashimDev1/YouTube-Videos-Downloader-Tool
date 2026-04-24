#!/usr/bin/env bash
set -o errexit

npm install
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt