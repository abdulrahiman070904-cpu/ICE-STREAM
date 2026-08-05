import os
import json
import time
import logging
from kafka import KafkaConsumer, KafkaProducer
from quality_processor import QualityProcessor
from circuit_breaker import StreamCircuitBreaker
from iceberg_sink import IcebergSink

logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "service": "flink-streaming-job", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
RAW_TOPIC = "checkout-events"
VALID_TOPIC = "checkout-events-valid"
INVALID_TOPIC = "checkout-events-invalid"
DLQ_TOPIC = "checkout-events-dlq"
ALERTS_TOPIC = "quality-alerts"

def run_pipeline():
    logger.info("Initializing Flink Streaming Job and Kafka connections...")
    
    circuit_breaker = StreamCircuitBreaker(error_threshold=0.02, recovery_interval_sec=15)
    iceberg_sink = IcebergSink(
        catalog_uri=os.getenv("ICEBERG_CATALOG_URI", "http://iceberg-rest:8181"),
        warehouse_path=os.getenv("ICEBERG_WAREHOUSE", "s3://lakehouse/warehouse")
    )
    
    # Setup Kafka consumer & producer with retry
    retries = 30
    consumer = None
    producer = None
    while retries > 0:
        try:
            consumer = KafkaConsumer(
                RAW_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                group_id="icestream-flink",
                auto_offset_reset="latest",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                enable_auto_commit=True
            )
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                value_serializer=lambda v: json.dumps(v).encode("utf-8")
            )
            logger.info("Kafka consumer & producer initialized successfully for Flink streaming pipeline.")
            break
        except Exception as e:
            logger.warning(f"Waiting for Kafka ({retries} retries left): {e}")
            time.sleep(2)
            retries -= 1

    if not consumer or not producer:
        logger.error("Failed to connect Flink to Kafka. Exiting.")
        return

    processed_count = 0
    valid_count = 0
    invalid_count = 0
    batch_valid = []
    batch_dlq = []

    logger.info("Flink streaming processor started listening for checkout events...")
    
    for message in consumer:
        try:
            record = message.value
            processed_count += 1
            is_valid, error_type, error_msg = QualityProcessor.validate_record(record)
            
            cb_transition = circuit_breaker.evaluate_metrics(processed_count, invalid_count)
            if cb_transition == "TRIPPED_OPEN":
                alert = {
                    "event": "CIRCUIT_BREAKER_OPEN",
                    "timestamp": time.time(),
                    "error_rate": (invalid_count / processed_count),
                    "threshold": circuit_breaker.error_threshold,
                    "reason": "Error rate exceeded SLA limit"
                }
                producer.send(ALERTS_TOPIC, value=alert)
                logger.error(f"CIRCUIT BREAKER TRIPPED OPEN! Error rate: {(invalid_count/processed_count)*100:.2f}%")

            if is_valid and circuit_breaker.is_accepting_main_traffic():
                valid_count += 1
                producer.send(VALID_TOPIC, value=record)
                batch_valid.append(record)
            else:
                invalid_count += 1
                dlq_record = {
                    "transaction_id": record.get("transaction_id", f"UNK-{processed_count}"),
                    "original_payload": record,
                    "error_type": error_type or "CIRCUIT_BREAKER_ISOLATION",
                    "error_message": error_msg or "Record diverted due to OPEN circuit breaker",
                    "failed_rule": "flink_validation_rules",
                    "detected_at": time.time(),
                    "source": "checkout-events",
                    "pipeline_stage": "flink-stream-processor",
                    "incident_id": f"INC-{time.strftime('%Y%m%d')}-001" if error_type else None
                }
                producer.send(INVALID_TOPIC, value=record)
                producer.send(DLQ_TOPIC, value=dlq_record)
                batch_dlq.append(dlq_record)

            if len(batch_valid) >= 50:
                iceberg_sink.write_valid_batch(batch_valid)
                batch_valid = []
            if len(batch_dlq) >= 20:
                iceberg_sink.write_dlq_batch(batch_dlq)
                batch_dlq = []

        except Exception as ex:
            logger.error(f"Error processing Flink stream message: {ex}", exc_info=True)

if __name__ == "__main__":
    run_pipeline()
