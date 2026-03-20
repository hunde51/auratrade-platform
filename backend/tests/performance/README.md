# Performance Smoke Tests

This folder contains lightweight non-functional validation scripts for AuraTrade backend.

## Quick Load Test

Run from `backend/`:

```bash
./venv/bin/python tests/performance/load_test.py \
  --base-url http://127.0.0.1:8000 \
  --seconds 30 \
  --concurrency 30
```

## Suggested MVP Targets

- `latency_ms_p95` < 200 for internal endpoints (`/health`, `/markets`) under moderate load.
- `error_rate_percent` < 1.0.
- Stable RPS without process crashes.

## Notes

- This script is intentionally dependency-light and async; it is a smoke benchmark, not a full capacity test.
- Use a dedicated toolchain (k6/Locust/Gatling) for production-grade load modeling.
