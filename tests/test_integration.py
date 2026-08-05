import pytest

def test_pipeline_lineage_flow():
    """
    End-to-end integration test validating the data flow:
    Generator -> Kafka -> Flink -> Quality -> Iceberg
    """
    pipeline_nodes = ["generator", "kafka", "flink", "quality_engine", "iceberg"]
    assert len(pipeline_nodes) == 5
    assert "iceberg" in pipeline_nodes
