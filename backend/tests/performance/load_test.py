#!/usr/bin/env python3
"""Simple async load test for AuraTrade backend endpoints.

Usage:
  python tests/performance/load_test.py --base-url http://127.0.0.1:8000 --seconds 30 --concurrency 30
"""

from __future__ import annotations

import argparse
import asyncio
import statistics
import time
from dataclasses import dataclass

import httpx


@dataclass
class Stats:
    latencies_ms: list[float]
    errors: int
    total: int


async def worker(client: httpx.AsyncClient, base_url: str, stop_at: float, stats: Stats) -> None:
    endpoints = [
        f"{base_url}/api/v1/health",
        f"{base_url}/api/v1/markets",
        f"{base_url}/api/v1/markets/BTCUSD",
    ]
    idx = 0

    while time.perf_counter() < stop_at:
        url = endpoints[idx % len(endpoints)]
        idx += 1
        started = time.perf_counter()
        try:
            response = await client.get(url)
            if response.status_code >= 500:
                stats.errors += 1
        except Exception:
            stats.errors += 1
        finally:
            elapsed_ms = (time.perf_counter() - started) * 1000
            stats.latencies_ms.append(elapsed_ms)
            stats.total += 1


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    k = max(0, min(len(sorted_values) - 1, int(round((p / 100.0) * (len(sorted_values) - 1)))))
    return sorted_values[k]


async def run_load(base_url: str, seconds: int, concurrency: int, timeout_s: float) -> Stats:
    stats = Stats(latencies_ms=[], errors=0, total=0)
    stop_at = time.perf_counter() + max(1, seconds)

    timeout = httpx.Timeout(timeout_s)
    limits = httpx.Limits(max_connections=max(20, concurrency * 2), max_keepalive_connections=max(10, concurrency))
    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        tasks = [asyncio.create_task(worker(client, base_url, stop_at, stats)) for _ in range(max(1, concurrency))]
        await asyncio.gather(*tasks)

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="AuraTrade backend load test")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Base URL of backend")
    parser.add_argument("--seconds", type=int, default=30, help="Test duration seconds")
    parser.add_argument("--concurrency", type=int, default=30, help="Number of async workers")
    parser.add_argument("--timeout", type=float, default=2.5, help="Per-request timeout seconds")
    args = parser.parse_args()

    started = time.perf_counter()
    stats = asyncio.run(run_load(args.base_url, args.seconds, args.concurrency, args.timeout))
    duration_s = max(0.001, time.perf_counter() - started)

    rps = stats.total / duration_s
    p50 = percentile(stats.latencies_ms, 50)
    p95 = percentile(stats.latencies_ms, 95)
    p99 = percentile(stats.latencies_ms, 99)
    mean = statistics.fmean(stats.latencies_ms) if stats.latencies_ms else 0.0
    err_rate = (stats.errors / stats.total * 100.0) if stats.total else 0.0

    print("AuraTrade Load Test Results")
    print(f"duration_s={duration_s:.2f}")
    print(f"requests_total={stats.total}")
    print(f"requests_per_second={rps:.2f}")
    print(f"errors_total={stats.errors}")
    print(f"error_rate_percent={err_rate:.2f}")
    print(f"latency_ms_mean={mean:.2f}")
    print(f"latency_ms_p50={p50:.2f}")
    print(f"latency_ms_p95={p95:.2f}")
    print(f"latency_ms_p99={p99:.2f}")


if __name__ == "__main__":
    main()
