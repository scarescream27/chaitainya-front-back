"""
=============================================================================
Chaitanya 2k26 — Multi-Threaded HTTP & API Server with Redis Caching
=============================================================================
- High-Performance Redis Caching (Dual-tier with instant in-memory fallback)
- ETag generation & HTTP 304 Not Modified validation for zero-byte repeat transfers
- Gzip compression on-the-fly & Redis gzip cache for JS, CSS, JSON, SVG, WASM
- Intelligent Cache-Control headers (immutable 1-yr for 3D models/textures/fonts)
- RESTful API endpoints (/api/events, /api/cache/stats, /api/cache/purge, /api/health)
- Byte-Range streaming for large 3D GLB assets & audio
- SPA routing fallback for Vue / Nuxt frontend
=============================================================================
"""

import http.server
import socketserver
import os
import mimetypes
import gzip
import time
import json
import re
from urllib.parse import urlparse, unquote

from redis_cache import cache, REDIS_ENABLED

PORT = int(os.environ.get("PORT", "3000"))
# Local development server: listen on loopback only unless HOST is set explicitly.
HOST = os.environ.get("HOST", "127.0.0.1")
DIRECTORY = os.path.realpath(os.path.dirname(os.path.abspath(__file__)))

# Never serve source, secrets, or tooling files from the project root.
BLOCKED_TOP_LEVEL = {
    'server.py', 'redis_cache.py', 'scripts', '__pycache__', 'node_modules',
    'chaitanya_schema.sql', 'firestore.rules', 'firestore.indexes.json',
    'firebase.json', 'package.json', 'package-lock.json',
}
BLOCKED_EXTS = {'.py', '.pyc', '.sql', '.md', '.pdf', '.env', '.rules'}


def resolve_safe_path(url_path):
    """Map a URL path to a file inside DIRECTORY, or None if it is not allowed."""
    parts = [p for p in url_path.split('/') if p]
    if any(p.startswith('.') for p in parts):  # dotfiles, .git, .env, '..'
        return None
    if parts and parts[0].lower() in BLOCKED_TOP_LEVEL:
        return None
    if parts and os.path.splitext(parts[-1])[1].lower() in BLOCKED_EXTS:
        return None
    full = os.path.realpath(os.path.join(DIRECTORY, *parts))
    if full != DIRECTORY and not full.startswith(DIRECTORY + os.sep):
        return None
    return full


def is_loopback(address):
    return address in ('127.0.0.1', '::1', 'localhost')

# Custom MIME types
CUSTOM_MIMETYPES = {
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.hdr': 'application/octet-stream',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.otf': 'font/otf',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.wasm': 'application/wasm',
    '.html': 'text/html; charset=utf-8',
}

for ext, mime in CUSTOM_MIMETYPES.items():
    mimetypes.add_type(mime, ext)

COMPRESSIBLE_EXTS = {'.html', '.js', '.mjs', '.css', '.json', '.svg', '.wasm', '.otf', '.ttf'}


class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


class CachedHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def address_string(self):
        # Bypass slow Windows reverse DNS lookup on localhost (saves 2000ms per request)
        return str(self.client_address[0])

    def log_message(self, format, *args):
        # Format clean, informative access log
        pass  # Suppress default noisy stdlib logs for sub-millisecond benchmarking

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, If-None-Match')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
        self.send_header('Accept-Ranges', 'bytes')

    def get_cache_control_header(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in ('.glb', '.gltf', '.hdr', '.mp3', '.wav', '.otf', '.ttf', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.webp'):
            # Immutable assets can be cached by browser and CDN for 1 year
            return 'public, max-age=31536000, immutable'
        elif ext in ('.js', '.mjs', '.css', '.wasm'):
            # Unversioned filenames: always revalidate (ETag makes this a cheap 304)
            return 'no-cache'
        elif ext in ('.html', ''):
            # HTML must revalidate with ETag to ensure instant deployments
            return 'public, max-age=0, must-revalidate'
        return 'public, max-age=3600'

    def send_json_response(self, data, status=200, cache_ttl=60, x_cache="HIT (Redis)"):
        body = json.dumps(data, indent=2).encode('utf-8')
        etag = cache.make_etag(body)

        client_etag = self.headers.get('If-None-Match')
        if client_etag and client_etag == etag:
            cache.record_revalidation()
            self.send_response(304)
            self.send_header('ETag', etag)
            self.send_header('X-Cache', 'REVALIDATED (304)')
            self.send_cors_headers()
            self.end_headers()
            return

        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('ETag', etag)
        self.send_header('Cache-Control', f'public, max-age={cache_ttl}, stale-while-revalidate=120')
        self.send_header('X-Cache', x_cache)
        self.send_header('X-Cache-Engine', cache.get_stats()['engine'])
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    # --------------------------------------------------------------------------
    # API Router
    # --------------------------------------------------------------------------

    def handle_api_routes(self, parsed_url):
        path = parsed_url.path.rstrip('/')

        # 1. /api/cache/stats
        if path == '/api/cache/stats':
            stats = cache.get_stats()
            self.send_json_response(stats, status=200, cache_ttl=5)
            return True

        # 3. /api/health
        if path == '/api/health':
            self.send_json_response({
                "status": "healthy",
                "service": "chaitanya-2k26",
                "redis_cache": cache.get_stats()["engine"],
                "uptime": cache.get_stats()["uptime_seconds"]
            }, status=200, cache_ttl=10)
            return True

        # 4. /api/events (Cached via Redis)
        if path == '/api/events':
            cached_events = cache.get_json("api:events_catalog")
            if cached_events:
                self.send_header_cache_status = "HIT (Redis)"
                self.send_json_response(cached_events, status=200, cache_ttl=300)
                return True

            # Load from events_catalog.json
            catalog_file = os.path.join(DIRECTORY, 'events_catalog.json')
            if os.path.exists(catalog_file):
                try:
                    with open(catalog_file, 'r', encoding='utf-8') as f:
                        catalog_data = json.load(f)
                    # Cache in Redis with 10-minute TTL
                    cache.set_json("api:events_catalog", catalog_data, ex=600)
                    self.send_json_response(catalog_data, status=200, cache_ttl=300)
                    return True
                except Exception as err:
                    self.send_json_response({"error": str(err)}, status=500)
                    return True

        return False

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.rstrip('/') == '/api/cache/purge':
            if not is_loopback(self.client_address[0]):
                self.send_error(403, "Cache purge is only allowed from localhost")
                return
            cache.flush()
            self.send_json_response({
                "success": True,
                "message": "Redis cache successfully purged via POST",
                "timestamp": time.time()
            }, status=200, cache_ttl=0)
            return
        self.send_error(404, "Endpoint not found")

    # --------------------------------------------------------------------------
    # Static Assets & Cached GET
    # --------------------------------------------------------------------------

    def do_GET(self):
        t_start = time.perf_counter()
        parsed = urlparse(self.path)

        # Check API routes first
        if parsed.path.startswith('/api/'):
            if self.handle_api_routes(parsed):
                return

        clean_path = unquote(parsed.path.split('?')[0].split('#')[0])
        if clean_path in ('', '/'):
            clean_path = '/index.html'

        # Resolve asset file path on disk (rejects traversal, dotfiles, sources)
        full_path = resolve_safe_path(clean_path)
        if full_path is None:
            self.send_error(404, "File not found")
            return

        # If path is a directory, look for index.html
        if os.path.isdir(full_path):
            index_path = os.path.join(full_path, 'index.html')
            if os.path.exists(index_path):
                clean_path = clean_path.rstrip('/') + '/index.html'
                full_path = index_path

        # Alias mapping for top-level asset directories
        asset_folders = ['/models/', '/images/', '/audio/', '/hdri/', '/fonts/']
        if not os.path.exists(full_path):
            for folder in asset_folders:
                if clean_path.startswith(folder):
                    alt_path = resolve_safe_path('/assets' + clean_path)
                    if alt_path and os.path.exists(alt_path):
                        clean_path = '/assets' + clean_path
                        full_path = alt_path
                        break

        # SPA Routing fallback
        is_spa_fallback = False
        if not os.path.exists(full_path) and not os.path.splitext(clean_path)[1]:
            clean_path = '/index.html'
            full_path = os.path.join(DIRECTORY, 'index.html')
            is_spa_fallback = True

        if not os.path.exists(full_path) or os.path.isdir(full_path):
            self.send_error(404, "File not found")
            return

        # Determine MIME type
        ext = os.path.splitext(full_path)[1].lower()
        mime_type = CUSTOM_MIMETYPES.get(ext, mimetypes.guess_type(full_path)[0] or 'application/octet-stream')

        # Check client gzip capability
        accept_encoding = self.headers.get('Accept-Encoding', '')
        supports_gzip = 'gzip' in accept_encoding and ext in COMPRESSIBLE_EXTS

        # Range request check
        range_header = self.headers.get('Range')

        # ----------------------------------------------------------------------
        # 1. Check Redis Cache for Asset
        # ----------------------------------------------------------------------
        # Key includes mtime so edited files are never served stale.
        cache_key = f"{clean_path}@{os.stat(full_path).st_mtime_ns}"
        cached = cache.get_asset(cache_key, want_gzip=supports_gzip)
        x_cache_status = "HIT (Redis)" if cached else "MISS (Redis)"
        file_bytes = None
        etag = None
        is_gzipped = False

        if cached and not range_header:
            file_bytes = cached["content"]
            etag = cached["etag"]
            is_gzipped = cached["is_gzip"]
        else:
            # Read from filesystem
            try:
                with open(full_path, 'rb') as f:
                    raw_bytes = f.read()
            except Exception as err:
                self.send_error(500, f"Error reading file: {err}")
                return

            etag = cache.make_etag(raw_bytes)

            # Compress if beneficial
            if supports_gzip and len(raw_bytes) > 512:
                gzipped_bytes = gzip.compress(raw_bytes, compresslevel=6)
                # Cache both raw and gzipped in Redis
                cache.cache_asset(cache_key, raw_bytes, mime_type, is_gzip=False)
                cache.cache_asset(cache_key, gzipped_bytes, mime_type, is_gzip=True)
                file_bytes = gzipped_bytes
                is_gzipped = True
            else:
                cache.cache_asset(cache_key, raw_bytes, mime_type, is_gzip=False)
                file_bytes = raw_bytes
                is_gzipped = False

        # ----------------------------------------------------------------------
        # 2. HTTP 304 Not Modified validation
        # ----------------------------------------------------------------------
        client_etag = self.headers.get('If-None-Match')
        if client_etag and client_etag == etag:
            cache.record_revalidation()
            self.send_response(304)
            self.send_header('ETag', etag)
            self.send_header('Cache-Control', self.get_cache_control_header(clean_path))
            self.send_header('X-Cache', 'REVALIDATED (304)')
            self.send_cors_headers()
            self.end_headers()
            return

        # ----------------------------------------------------------------------
        # 3. Handle Range Requests (for 3D models & audio)
        # ----------------------------------------------------------------------
        total_len = len(file_bytes)
        if range_header and not is_gzipped:
            match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else total_len - 1
                if start < total_len and end >= start:
                    end = min(end, total_len - 1)
                    content_length = end - start + 1
                    self.send_response(206)
                    self.send_header('Content-Type', mime_type)
                    self.send_header('Content-Range', f'bytes {start}-{end}/{total_len}')
                    self.send_header('Content-Length', str(content_length))
                    self.send_header('ETag', etag)
                    self.send_header('Cache-Control', self.get_cache_control_header(clean_path))
                    self.send_header('X-Cache', x_cache_status)
                    self.send_cors_headers()
                    self.end_headers()
                    self.wfile.write(file_bytes[start:end+1])
                    return

        # ----------------------------------------------------------------------
        # 4. Standard 200 OK Response
        # ----------------------------------------------------------------------
        t_duration_ms = (time.perf_counter() - t_start) * 1000

        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.send_header('Content-Length', str(len(file_bytes)))
        if is_gzipped:
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
        self.send_header('ETag', etag)
        self.send_header('Cache-Control', self.get_cache_control_header(clean_path))
        self.send_header('X-Cache', x_cache_status)
        self.send_header('X-Cache-Engine', cache.get_stats()['engine'])
        self.send_header('X-Response-Time', f"{t_duration_ms:.2f}ms")
        self.send_cors_headers()
        self.end_headers()

        # Send body
        self.wfile.write(file_bytes)


def run():
    os.chdir(DIRECTORY)
    stats = cache.get_stats()
    print("=" * 70)
    print(f"[*] Chaitanya 2k26 Server with Redis Caching")
    print(f"    URL:          http://{'localhost' if HOST == '127.0.0.1' else HOST}:{PORT}")
    print(f"    Cache Engine: {stats['engine']} (URL: {stats['redis_url']})")
    print(f"    Max Cache:    {stats['max_cached_file_size_mb']} MB per file")
    print(f"    API Routes:   /api/events | /api/cache/stats | /api/cache/purge")
    print("=" * 70)

    with ThreadedHTTPServer((HOST, PORT), CachedHTTPHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[SERVER] Server stopped.")


if __name__ == '__main__':
    run()
