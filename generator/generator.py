import os
import time
import json
import random
import logging
from datetime import datetime, timezone
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable
from schemas import AnomalyConfig
from anomaly_injector import AnomalyInjector

logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "service": "transaction-generator", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC = os.getenv("KAFKA_TOPIC", "checkout-events")

def get_kafka_producer():
    retries = 30
    while retries > 0:
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                retries=5,
                linger_ms=10,
                batch_size=16384
            )
            logger.info("Connected to Kafka Broker successfully.")
            return producer
        except NoBrokersAvailable:
            logger.warning(f"Kafka broker not ready at {KAFKA_BOOTSTRAP}. Retrying in 2s ({retries} left)...")
            time.sleep(2)
            retries -= 1
    raise RuntimeError("Failed to connect to Kafka after multiple retries.")

def generate_base_event(tx_seq: int) -> dict:
    unit_price = round(random.uniform(50.0, 2500.0), 2)
    quantity = random.randint(1, 5)
    total_amount = round(unit_price * quantity, 2)
    
    return {
        "transaction_id": f"TXN-{tx_seq:07d}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "customer_id": f"CUS-{random.randint(1000, 9999)}",
        "product_id": f"PROD-{random.randint(100, 999)}",
        "quantity": quantity,
        "unit_price": unit_price,
        "total_amount": total_amount,
        "currency": random.choice(["INR", "USD", "EUR", "GBP"]),
        "payment_method": random.choice(["UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "WALLET"]),
        "payment_status": random.choices(["SUCCESS", "PENDING", "FAILED", "REFUNDED"], weights=[0.85, 0.08, 0.05, 0.02])[0],
        "region": random.choice(["HYDERABAD", "BANGALORE", "MUMBAI", "DELHI", "CHENNAI", "PUNE"]),
        "device_type": random.choice(["MOBILE", "DESKTOP", "TABLET"]),
        "event_type": "CHECKOUT"
    }

def main():
    config = AnomalyConfig(
        events_per_second=int(os.getenv("EVENTS_PER_SECOND", "250")),
        anomaly_rate=float(os.getenv("ANOMALY_RATE", "0.01")),
        schema_drift_rate=float(os.getenv("SCHEMA_DRIFT_RATE", "0.005")),
        null_rate=float(os.getenv("NULL_RATE", "0.01")),
    )
    
    logger.info(f"Starting Transaction Generator targeting topic '{TOPIC}' with config: {config.model_dump_json()}")
    producer = get_kafka_producer()
    
    tx_count = 1
    last_log_time = time.time()
    batch_count = 0
    
    while True:
        try:
            start_batch = time.time()
            rate = config.events_per_second
            delay_per_event = 1.0 / max(rate, 1)
            
            event = generate_base_event(tx_count)
            tx_count += 1
            
            # Anomaly injection logic
            rand_val = random.random()
            if config.force_anomaly_type == "null" or rand_val < config.null_rate:
                event = AnomalyInjector.inject_nulls(event)
            elif config.force_anomaly_type == "schema_drift" or rand_val < (config.null_rate + config.schema_drift_rate):
                event = AnomalyInjector.inject_schema_drift(event)
            elif config.force_anomaly_type == "invalid_amount" or rand_val < (config.null_rate + config.schema_drift_rate + config.anomaly_rate):
                event = AnomalyInjector.inject_invalid_amount(event)
                
            producer.send(TOPIC, key=event.get("transaction_id", "UNK"), value=event)
            batch_count += 1
            
            if time.time() - last_log_time >= 5.0:
                eps = batch_count / (time.time() - last_log_time)
                logger.info(f"Published {batch_count} transactions to Kafka ({eps:.1f} events/s). Last ID: {event.get('transaction_id')}")
                batch_count = 0
                last_log_time = time.time()
                
            time.sleep(delay_per_event)
            
        except Exception as e:
            logger.error(f"Error publishing transaction event: {str(e)}", exc_info=True)
            time.sleep(1)

if __name__ == "__main__":
    main()
