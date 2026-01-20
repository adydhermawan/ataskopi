#!/bin/bash
# Script to run automated integration tests in Chrome

CHROMEDRIVER_PATH="./chromedriver"

# Check if chromedriver is available locally
if [ ! -f "$CHROMEDRIVER_PATH" ]; then
    echo "Error: chromedriver not found at $CHROMEDRIVER_PATH."
    echo "Please ensure chromedriver is in the project directory."
    exit 1
fi

echo "Starting Automated Design Verification in Chrome..."
echo "Target: integration_test/app_test.dart"

# Start chromedriver in background if not already running on port 4444
if ! lsof -i:4444 > /dev/null 2>&1; then
    echo "Starting chromedriver..."
    $CHROMEDRIVER_PATH --port=4444 &
    CHROME_PID=$!
    sleep 2
fi

/usr/local/flutter/bin/flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart -d chrome

# Cleanup
if [ ! -z "$CHROME_PID" ]; then
    kill $CHROME_PID 2>/dev/null
fi

echo "Test execution completed."
