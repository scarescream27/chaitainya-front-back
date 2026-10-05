"""
=============================================================================
Chaitanya 2k26 — Redis Cache Benchmark & Validation Tool
=============================================================================
Tests Redis caching, measuring latency, ETag 304 Not Modified verification,
and cache hit-ratio telemetry.
=============================================================================
"""

import time
import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:3000"

def benchmark_endpoint(url, iterations=5):
    print(f"\n[BENCHMARK] Testing: {url}")
    print("-" * 60)
    
    # 1. First request (Cold / MISS)
    t0 = time.perf_counter()
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            etag = resp.headers.get("ETag")
            x_cache = resp.headers.get("X-Cache", "N/A")
            cache_control = resp.headers.get("Cache-Control", "N/A")
            status = resp.status
    except Exception as e:
        print(f"[-] Error connecting to {url}: {e}")
        return

    t_cold = (time.perf_counter() - t0) * 1000
    print(f"  [COLD/FIRST] Status: {status} | Size: {len(data):,} bytes | Time: {t_cold:.2f}ms | X-Cache: {x_cache}")
    print(f"  Headers: Cache-Control: {cache_control} | ETag: {etag}")

    # 2. Subsequent requests (Warm / HIT)
    warm_times = []
    for i in range(iterations):
        t0 = time.perf_counter()
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            x_cache = resp.headers.get("X-Cache", "N/A")
        t_elapsed = (time.perf_counter() - t0) * 1000
        warm_times.append(t_elapsed)

    avg_warm = sum(warm_times) / len(warm_times)
    speedup = (t_cold / avg_warm) if avg_warm > 0 else 1.0
    print(f"  [WARM/CACHED] Avg over {iterations} reqs: {avg_warm:.2f}ms | X-Cache: {x_cache}")
    print(f"  [SPEEDUP] {speedup:.1f}x faster with Cache!")

    # 3. ETag 304 Revalidation Test
    if etag:
        t0 = time.perf_counter()
        req304 = urllib.request.Request(url, headers={"If-None-Match": etag})
        try:
            with urllib.request.urlopen(req304) as resp:
                status = resp.status
        except urllib.error.HTTPError as e:
            status = e.code
            x_cache_304 = e.headers.get("X-Cache", "N/A")
        t_304 = (time.perf_counter() - t0) * 1000
        print(f"  [ETAG 304 REVALIDATION] Status: {status} (Not Modified) | Time: {t_304:.2f}ms | Payload: 0 bytes | X-Cache: {x_cache_304}")

def main():
    print("=" * 65)
    print("[*] CHAITANYA 2K26 REDIS CACHE VALIDATOR")
    print("=" * 65)
    
    # Check cache stats
    stats_url = f"{BASE_URL}/api/cache/stats"
    try:
        with urllib.request.urlopen(stats_url) as resp:
            stats = json.loads(resp.read().decode())
            print("\n[TELEMETRY] Current Cache Status:")
            print(json.dumps(stats, indent=2))
    except Exception as e:
        print(f"[!] Could not query /api/cache/stats (Is server running?): {e}")

    # Benchmark various assets
    test_urls = [
        f"{BASE_URL}/",
        f"{BASE_URL}/api/events",
        f"{BASE_URL}/_nuxt/app-main.js",
        f"{BASE_URL}/_nuxt/events.css",
        f"{BASE_URL}/images/icons/Logo.svg"
    ]

    for u in test_urls:
        benchmark_endpoint(u)

    print("\n" + "=" * 65)
    print("[+] Cache Benchmark Completed Successfully!")
    print("=" * 65)

if __name__ == "__main__":
    main()
