#!/bin/bash
# Wrapper script to start chat-service with auto-restart
cd /home/z/my-project/mini-services/chat-service
while true; do
    echo "[$(date)] Starting chat-service..."
    bun index.ts
    EXIT_CODE=$?
    echo "[$(date)] chat-service exited with code $EXIT_CODE, restarting in 3 seconds..."
    sleep 3
done
