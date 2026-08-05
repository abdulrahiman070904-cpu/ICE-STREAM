import os
import time
import logging
from pyiceberg.catalog import load_catalog
from tables import CHECKOUT_EVENTS_SCHEMA, CHECKOUT_EVENTS_DLQ_SCHEMA, QUALITY_METRICS_SCHEMA

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iceberg-init")

def init_tables():
    catalog_uri = os.getenv("ICEBERG_CATALOG_URI", "http://iceberg-rest:8181")
    warehouse = os.getenv("ICEBERG_WAREHOUSE", "s3://lakehouse/warehouse")
    
    logger.info(f"Connecting to Iceberg REST Catalog at {catalog_uri}...")
    catalog = load_catalog(
        "rest",
        **{
            "uri": catalog_uri,
            "s3.endpoint": os.getenv("MINIO_ENDPOINT", "http://minio:9000"),
            "s3.access-key-id": os.getenv("MINIO_ACCESS_KEY", "admin"),
            "s3.secret-access-key": os.getenv("MINIO_SECRET_KEY", "password123"),
            "warehouse": warehouse
        }
    )

    namespace = "ecommerce"
    try:
        catalog.create_namespace(namespace)
        logger.info(f"Created namespace '{namespace}'")
    except Exception as e:
        logger.info(f"Namespace '{namespace}' already exists: {e}")

    tables = [
        (f"{namespace}.checkout_events", CHECKOUT_EVENTS_SCHEMA),
        (f"{namespace}.checkout_events_dlq", CHECKOUT_EVENTS_DLQ_SCHEMA),
        (f"{namespace}.quality_metrics", QUALITY_METRICS_SCHEMA)
    ]

    for table_name, schema in tables:
        try:
            catalog.create_table(table_name, schema=schema)
            logger.info(f"Successfully created Iceberg table: {table_name}")
        except Exception as ex:
            logger.info(f"Table {table_name} already exists or initialized: {ex}")

if __name__ == "__main__":
    init_tables()
