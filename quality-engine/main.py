import os
import json
import time
import logging
from kafka import KafkaConsumer, KafkaProducer
from rules import QualityRulesEngine
from detector import AnomalyDetector
from remediation import RemediationWorkflow

logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "service": "quality-engine", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
RAW_TOPIC = "checkout-events"
ALERTS_TOPIC = "quality-alerts"
REMEDIATION_TOPIC = "remediation-events"

def main():
    logger.info("Starting IceStream Quality & Observability Rules Engine...")
    
    detector = AnomalyDetector(window_size_sec=60, error_threshold=0.02)
    
    retries = 30
    consumer = None
    producer = None
    while retries > 0:
        try:
            consumer = KafkaConsumer(
                RAW_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                group_id="icestream-quality",
                auto_offset_reset="latest",
                value_deserializer=lambda m: json.loads(m.decode("utf-8"))
            )
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                value_serializer=lambda v: json.dumps(v).encode("utf-8")
            )
            logger.info("Kafka consumer/producer ready in Quality Engine.")
            break
        except Exception as e:
            logger.warning(f"Connecting to Kafka ({retries} left): {e}")
            time.sleep(2)
            retries -= 1

    if not consumer or not producer:
        logger.error("Could not connect to Kafka. Exiting.")
        return

    batch = []
    last_eval_time = time.time()
    active_incident = None

    for message in consumer:
        try:
            record = message.value
            batch.append(record)

            if len(batch) >= 25 or (time.time() - last_eval_time >= 2.0):
                rule_results = QualityRulesEngine.evaluate_batch(batch)
                
                # Check for anomalies
                for rec in batch:
                    has_null = any(rec.get(f) is None for f in QualityRulesEngine.REQUIRED_FIELDS)
                    has_drift = (len(set(rec.keys()) - set(QualityRulesEngine.REQUIRED_FIELDS)) > 3)
                    is_valid = not has_null and not has_drift
                    detector.record_event(is_valid=is_valid, has_null=has_null, has_schema_error=has_drift)

                metrics = detector.get_metrics()
                
                if metrics["is_anomaly"] and not active_incident:
                    inc_id = f"INC-{time.strftime('%Y%m%d')}-{int(time.time())%1000:03d}"
                    logger.error(f"ANOMALY TRIGGERED: Error rate {metrics['error_rate']}% exceeds threshold 2.0%! Incident {inc_id} created.")
                    
                    workflow = RemediationWorkflow(incident_id=inc_id, anomaly_type="NULL_AND_SCHEMA_ANOMALY", affected_records_count=metrics["events_invalid"])
                    active_incident = workflow
                    
                    alert = {
                        "event": "ANOMALY_DETECTED",
                        "incident_id": inc_id,
                        "timestamp": time.time(),
                        "error_rate": metrics["error_rate"],
                        "threshold": 2.0,
                        "affected_node": "Data Quality Engine",
                        "root_cause": "Spike in missing total_amount / schema drift"
                    }
                    producer.send(ALERTS_TOPIC, value=alert)
                    
                    # Run auto remediation
                    workflow.execute_auto_recovery_cycle()
                    producer.send(REMEDIATION_TOPIC, value=workflow.to_dict())
                    active_incident = None
                
                batch = []
                last_eval_time = time.time()

        except Exception as ex:
            logger.error(f"Error in Quality Engine event loop: {ex}", exc_info=True)

if __name__ == "__main__":
    main()
