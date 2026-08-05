import time
from typing import Dict, Any

class StreamCircuitBreaker:
    """
    Real-time circuit breaker tracking stream safety:
    - CLOSED: Normal streaming ingestion to Iceberg main table.
    - OPEN: Error rate exceeded threshold (>2%). Unsafe stream isolated, all bad data to DLQ, alarms raised.
    - HALF_OPEN: Trial period allowing a sample batch through for validation.
    """
    def __init__(self, error_threshold: float = 0.02, recovery_interval_sec: int = 15):
        self.error_threshold = error_threshold
        self.recovery_interval_sec = recovery_interval_sec
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.last_state_change = time.time()
        self.total_events = 0
        self.invalid_events = 0
        self.half_open_sample_count = 0
        self.half_open_max_samples = 50

    def evaluate_metrics(self, total: int, invalid: int) -> str:
        self.total_events = total
        self.invalid_events = invalid
        error_rate = (invalid / total) if total > 0 else 0.0
        now = time.time()

        if self.state == "CLOSED":
            if error_rate > self.error_threshold and total >= 20:
                self.state = "OPEN"
                self.last_state_change = now
                return "TRIPPED_OPEN"

        elif self.state == "OPEN":
            if now - self.last_state_change >= self.recovery_interval_sec:
                self.state = "HALF_OPEN"
                self.last_state_change = now
                self.half_open_sample_count = 0
                return "TRANSITION_HALF_OPEN"

        elif self.state == "HALF_OPEN":
            self.half_open_sample_count += 1
            if self.half_open_sample_count >= self.half_open_max_samples:
                if error_rate <= self.error_threshold:
                    self.state = "CLOSED"
                    self.last_state_change = now
                    return "RECOVERED_CLOSED"
                else:
                    self.state = "OPEN"
                    self.last_state_change = now
                    return "FAILED_REOPEN"

        return "NO_CHANGE"

    def is_accepting_main_traffic(self) -> bool:
        return self.state in ("CLOSED", "HALF_OPEN")

    def get_status_dict(self) -> Dict[str, Any]:
        return {
            "state": self.state,
            "error_threshold": self.error_threshold,
            "last_state_change": self.last_state_change,
            "total_events": self.total_events,
            "invalid_events": self.invalid_events,
            "current_error_rate": (self.invalid_events / max(self.total_events, 1))
        }
