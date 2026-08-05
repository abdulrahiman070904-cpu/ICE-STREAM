import time
from collections import deque
from typing import Dict, Any, List

class AnomalyDetector:
    """
    Sliding 60-second window metrics collector and anomaly detector:
    - Tracks events_processed, events_valid, events_invalid, null_count, schema_errors, latency, error_rate, throughput
    - Triggers circuit breaker alert if error_rate > threshold (2%)
    """
    def __init__(self, window_size_sec: int = 60, error_threshold: float = 0.02):
        self.window_size_sec = window_size_sec
        self.error_threshold = error_threshold
        self.history = deque()  # stores (timestamp, is_valid, has_null, has_schema_error, latency_ms)

    def record_event(self, is_valid: bool, has_null: bool = False, has_schema_error: bool = False, latency_ms: float = 45.0):
        now = time.time()
        self.history.append((now, is_valid, has_null, has_schema_error, latency_ms))
        self._prune_old(now)

    def _prune_old(self, current_time: float):
        cutoff = current_time - self.window_size_sec
        while self.history and self.history[0][0] < cutoff:
            self.history.popleft()

    def get_metrics(self) -> Dict[str, Any]:
        self._prune_old(time.time())
        total = len(self.history)
        if total == 0:
            return {
                "events_processed": 0,
                "events_valid": 0,
                "events_invalid": 0,
                "null_count": 0,
                "schema_errors": 0,
                "processing_latency": 45.0,
                "error_rate": 0.0,
                "throughput": 0.0,
                "is_anomaly": False
            }

        valid_count = sum(1 for e in self.history if e[1])
        invalid_count = total - valid_count
        null_count = sum(1 for e in self.history if e[2])
        schema_count = sum(1 for e in self.history if e[3])
        avg_latency = sum(e[4] for e in self.history) / total
        error_rate = invalid_count / total
        throughput = round(total / max(self.window_size_sec, 1), 1)

        is_anomaly = (error_rate > self.error_threshold) and (total >= 10)

        return {
            "events_processed": total,
            "events_valid": valid_count,
            "events_invalid": invalid_count,
            "null_count": null_count,
            "schema_errors": schema_count,
            "processing_latency": round(avg_latency, 1),
            "error_rate": round(error_rate * 100, 2),
            "throughput": throughput,
            "is_anomaly": is_anomaly
        }
