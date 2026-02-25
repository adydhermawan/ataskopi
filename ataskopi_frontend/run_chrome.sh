#!/bin/bash
# Helper script to run Flutter on Chrome using the correct path

FLUTTER_PATH="/usr/local/flutter/bin/flutter"

echo "Running Flutter with path: $FLUTTER_PATH"
$FLUTTER_PATH run -d chrome --web-port=4000
