import http.server
import socketserver
import os
import mimetypes

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Custom MIME types
CUSTOM_MIMETYPES = {
    '.glb': 'model/gltf-binary',
    '.hdr': 'application/octet-stream',
    '.mp3': 'audio/mpeg',
    '.otf': 'font/otf',
    '.ttf': 'font/ttf',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.wasm': 'application/wasm',
}

for ext, mime in CUSTOM_MIMETYPES.items():
    mimetypes.add_type(mime, ext)

class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and Range requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Clean query string / fragment
        clean_path = self.path.split('?')[0].split('#')[0]
        
        # Check if file exists at root level
        full_path = os.path.join(DIRECTORY, clean_path.lstrip('/'))

        # Alias mapping for top-level asset directories (/models/*, /images/*, /audio/*, /hdri/*, /fonts/*)
        asset_folders = ['/models/', '/images/', '/audio/', '/hdri/', '/fonts/']
        if not os.path.exists(full_path):
            for folder in asset_folders:
                if clean_path.startswith(folder):
                    alt_path = os.path.join(DIRECTORY, 'assets' + clean_path)
                    if os.path.exists(alt_path):
                        self.path = '/assets' + clean_path
                        full_path = alt_path
                        break

        # SPA Routing fallback: If non-file path doesn't exist, serve index.html
        if not os.path.exists(full_path) and not os.path.splitext(clean_path)[1]:
            self.path = '/index.html'

        return super().do_GET()

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in CUSTOM_MIMETYPES:
            return CUSTOM_MIMETYPES[ext]
        return super().guess_type(path)

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with ThreadedHTTPServer(("", PORT), CustomHandler) as httpd:
        print(f"Multi-threaded server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
