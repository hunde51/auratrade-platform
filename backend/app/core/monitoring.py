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

        self._websocket_connections = 0
        self._redis_available = 0
        self._database_available = 0
        self._worker_running = 0

    def record_http_request(self, *, method: str, path: str, status_code: int, latency_seconds: float) -> None:
        status_label = str(status_code)

        with self._lock:
            self._request_count_total += 1
            self._request_latency_sum_seconds += max(latency_seconds, 0)
            self._request_latency_count += 1

            label = (method.upper(), path, status_label)
            self._requests_by_label[label] = self._requests_by_label.get(label, 0) + 1

            if status_code >= 500:
                self._error_count_total += 1

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
                ]
            )

        return "\n".join(lines) + "\n"


metrics_registry = MetricsRegistry()
