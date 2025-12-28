#!/bin/bash

# Kafka Topic Creation Script for Development
# This script creates all required Kafka topics for the HR App

set -e

# When running docker exec, we're INSIDE the container
# Use port 9093 which is the exposed CLIENT listener
BROKER_INTERNAL="localhost:9093"
CONTAINER="${KAFKA_CONTAINER:-broker}"

echo "=========================================="
echo "Creating Kafka Topics for HR App"
echo "=========================================="
echo "Container: $CONTAINER"
echo "Broker (internal): $BROKER_INTERNAL"
echo ""

# Function to create topic
create_topic() {
  local topic=$1
  local partitions=${2:-1}
  local replication=${3:-1}
  
  echo "→ Creating topic: $topic"
  docker exec $CONTAINER /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server $BROKER_INTERNAL \
    --create \
    --if-not-exists \
    --topic "$topic" \
    --partitions $partitions \
    --replication-factor $replication
  
  if [ $? -eq 0 ]; then
    echo "  ✓ Topic created: $topic"
  else
    echo "  ✗ Failed to create: $topic"
  fi
  echo ""
}

# Create all required topics
create_topic "attendance.dashboard_update" 1 1
create_topic "attendance.clock_in" 1 1
create_topic "attendance.clock_out" 1 1
create_topic "attendance.late_arrival" 1 1
create_topic "attendance.early_leave" 1 1

echo "=========================================="
echo "Listing all topics:"
echo "=========================================="
docker exec $CONTAINER /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server $BROKER_INTERNAL \
  --list

echo ""
echo "✓ All topics created successfully!"
echo ""
echo "You can now start the application:"
echo "  pnpm run start:dev"
echo "  # or"
echo "  docker-compose up -d"
echo ""
