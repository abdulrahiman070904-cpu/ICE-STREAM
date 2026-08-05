#!/bin/bash
set -e

KAFKA_BROKER=${KAFKA_BOOTSTRAP_SERVERS:-"kafka:9092"}
echo "Waiting for Kafka broker at $KAFKA_BROKER..."

# List of topics with partitions and retention settings
TOPICS=(
  "checkout-events:3:86400000"
  "checkout-events-valid:3:86400000"
  "checkout-events-invalid:3:86400000"
  "checkout-events-dlq:3:604800000"
  "pipeline-events:3:86400000"
  "quality-alerts:3:604800000"
  "remediation-events:3:604800000"
)

for topic_config in "${TOPICS[@]}"; do
  IFS=":" read -r topic partitions retention <<< "$topic_config"
  echo "Creating topic $topic (Partitions: $partitions, Retention: $retention ms)..."
  kafka-topics --bootstrap-server "$KAFKA_BROKER" \
    --create --if-not-exists \
    --topic "$topic" \
    --partitions "$partitions" \
    --replication-factor 1 \
    --config retention.ms="$retention"
done

echo "Kafka topics created successfully:"
kafka-topics --bootstrap-server "$KAFKA_BROKER" --list
