from threading import Lock


class MetricsRegistry:
    """In-memory Prometheus-style counters and gauges for MVP monitoring."""

    def __init__(self) -> None:
        self._lock = Lock()

        self._request_count_total = 0
        self._error_count_total = 0
        self._request_latency_sum_seconds = 0.0
        self._request_latency_count = 0
        self._requests_by_label: dict[tuple[str, str, str], int] = {}
        self._http_latency_buckets = [0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
        self._http_latency_histogram: dict[tuple[str, str, str], int] = {}

        self._websocket_connections = 0
        self._redis_available = 0
        self._database_available = 0
        self._worker_running = 0
        self._provider_calls: dict[tuple[str, str, str], int] = {}

    def record_http_request(self, *, method: str, path: str, status_code: int, latency_seconds: float) -> None:
        status_label = str(status_code)

        with self._lock:
            self._request_count_total += 1
            self._request_latency_sum_seconds += max(latency_seconds, 0)
            self._request_latency_count += 1

            label = (method.upper(), path, status_label)
            self._requests_by_label[label] = self._requests_by_label.get(label, 0) + 1

            normalized_latency = max(latency_seconds, 0)
            for boundary in self._http_latency_buckets:
                if normalized_latency <= boundary:
                    bucket_label = (method.upper(), path, self._bucket_to_label(boundary))
                    self._http_latency_histogram[bucket_label] = self._http_latency_histogram.get(bucket_label, 0) + 1
            inf_label = (method.upper(), path, "+Inf")
            self._http_latency_histogram[inf_label] = self._http_latency_histogram.get(inf_label, 0) + 1

            if status_code >= 500:
                self._error_count_total += 1

    def record_provider_call(self, *, service: str, provider: str, outcome: str) -> None:
        normalized_service = service.strip().lower() or "unknown"
        normalized_provider = provider.strip().lower() or "unknown"
        normalized_outcome = outcome.strip().lower() or "unknown"
        with self._lock:
            label = (normalized_service, normalized_provider, normalized_outcome)
            self._provider_calls[label] = self._provider_calls.get(label, 0) + 1

    def set_websocket_connections(self, count: int) -> None:
        with self._lock:
            self._websocket_connections = max(count, 0)

    def set_dependency_status(self, *, redis_available: bool, database_available: bool, worker_running: bool) -> None:
        with self._lock:
            self._redis_available = 1 if redis_available else 0
            self._database_available = 1 if database_available else 0
            self._worker_running = 1 if worker_running else 0

    def render_prometheus(self) -> str:
        with self._lock:
            lines: list[str] = [
                "# HELP auratrade_http_requests_total Total number of HTTP requests.",
                "# TYPE auratrade_http_requests_total counter",
            ]

            for (method, path, status), count in sorted(self._requests_by_label.items()):
                escaped_path = path.replace('\\', '\\\\').replace('"', '\\"')
                lines.append(
                    f'auratrade_http_requests_total{{method="{method}",path="{escaped_path}",status="{status}"}} {count}'
                )

            lines.extend(
                [
                    "# HELP auratrade_http_request_duration_seconds HTTP request latency histogram.",
                    "# TYPE auratrade_http_request_duration_seconds histogram",
                ]
            )
            for (method, path, le), count in sorted(self._http_latency_histogram.items()):
                escaped_path = path.replace('\\', '\\\\').replace('"', '\\"')
                lines.append(
                    f'auratrade_http_request_duration_seconds_bucket{{method="{method}",path="{escaped_path}",le="{le}"}} {count}'
                )
            lines.append(f"auratrade_http_request_duration_seconds_sum {self._request_latency_sum_seconds}")
            lines.append(f"auratrade_http_request_duration_seconds_count {self._request_latency_count}")

            lines.extend(
                [
                    "# HELP auratrade_http_request_latency_seconds_sum Total accumulated HTTP latency in seconds.",
                    "# TYPE auratrade_http_request_latency_seconds_sum counter",
                    f"auratrade_http_request_latency_seconds_sum {self._request_latency_sum_seconds}",
                    "# HELP auratrade_http_request_latency_seconds_count Number of latency samples.",
                    "# TYPE auratrade_http_request_latency_seconds_count counter",
                    f"auratrade_http_request_latency_seconds_count {self._request_latency_count}",
                    "# HELP auratrade_http_errors_total Total number of HTTP 5xx responses.",
                    "# TYPE auratrade_http_errors_total counter",
                    f"auratrade_http_errors_total {self._error_count_total}",
                    "# HELP auratrade_websocket_connections Active websocket connections.",
                    "# TYPE auratrade_websocket_connections gauge",
                    f"auratrade_websocket_connections {self._websocket_connections}",
                    "# HELP auratrade_dependency_status Dependency health gauge (1=up, 0=down).",
                    "# TYPE auratrade_dependency_status gauge",
                    f'auratrade_dependency_status{{dependency="redis"}} {self._redis_available}',
                    f'auratrade_dependency_status{{dependency="database"}} {self._database_available}',
                    f'auratrade_dependency_status{{dependency="worker"}} {self._worker_running}',
                    "# HELP auratrade_provider_calls_total External provider call outcomes.",
                    "# TYPE auratrade_provider_calls_total counter",
                ]
            )

            for (service, provider, outcome), count in sorted(self._provider_calls.items()):
                lines.append(
                    f'auratrade_provider_calls_total{{service="{service}",provider="{provider}",outcome="{outcome}"}} {count}'
                )

        return "\n".join(lines) + "\n"

    def _bucket_to_label(self, boundary: float) -> str:
        text = f"{boundary:.2f}".rstrip("0").rstrip(".")
        return text


metrics_registry = MetricsRegistry()
