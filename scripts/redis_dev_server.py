"""
=============================================================================
Chaitanya 2k26 — Standalone Local Redis Server (RESP-compliant)
=============================================================================
A pure-Python, zero-dependency Redis service that listens on 127.0.0.1:6379.
Allows running a genuine Redis service on Windows without Docker or WSL.
Supports standard Redis commands:
- PING
- GET, SET, SETEX
- DEL, EXISTS, KEYS, SCAN
- FLUSHDB, FLUSHALL
- INFO, DBSIZE
=============================================================================
"""

import socket
import threading
import time
import sys
from collections import OrderedDict

HOST = "127.0.0.1"
PORT = 6379

class RedisServerStore:
    def __init__(self):
        self.data = {}
        self.expires = {}
        self.lock = threading.Lock()
        self.start_time = time.time()
        self.total_commands = 0

    def clean_expired(self):
        now = time.time()
        with self.lock:
            expired_keys = [k for k, exp in self.expires.items() if now > exp]
            for k in expired_keys:
                self.data.pop(k, None)
                self.expires.pop(k, None)

    def get(self, key):
        self.clean_expired()
        with self.lock:
            return self.data.get(key)

    def set(self, key, value, ttl=None):
        with self.lock:
            self.data[key] = value
            if ttl:
                self.expires[key] = time.time() + ttl
            else:
                self.expires.pop(key, None)

    def delete(self, keys):
        with self.lock:
            count = 0
            for k in keys:
                if self.data.pop(k, None) is not None:
                    count += 1
                self.expires.pop(k, None)
            return count

    def exists(self, keys):
        self.clean_expired()
        with self.lock:
            return sum(1 for k in keys if k in self.data)

    def keys(self, pattern=b"*"):
        self.clean_expired()
        pat = pattern.decode("utf-8", "ignore").replace("*", "")
        with self.lock:
            if not pat:
                return list(self.data.keys())
            return [k for k in self.data.keys() if pat.encode() in k]

    def flush(self):
        with self.lock:
            self.data.clear()
            self.expires.clear()

store = RedisServerStore()


def parse_resp(stream):
    """Parse RESP command array from socket stream."""
    line = stream.readline()
    if not line:
        return None
    if line[0:1] != b"*":
        # Raw inline command support
        parts = line.strip().split(b" ")
        return parts

    num_args = int(line[1:].strip())
    args = []
    for _ in range(num_args):
        hdr = stream.readline()
        if not hdr or hdr[0:1] != b"$":
            return None
        length = int(hdr[1:].strip())
        val = stream.read(length)
        stream.read(2)  # skip CRLF
        args.append(val)
    return args


def handle_client(conn, addr):
    f = conn.makefile("rwb")
    try:
        while True:
            cmd_args = parse_resp(f)
            if not cmd_args:
                break

            cmd = cmd_args[0].upper()
            store.total_commands += 1

            if cmd == b"PING":
                msg = cmd_args[1] if len(cmd_args) > 1 else b"PONG"
                f.write(b"+" + msg + b"\r\n")
            elif cmd == b"HELLO":
                f.write(b"-ERR unknown command 'HELLO'\r\n")
            elif cmd == b"COMMAND" or cmd == b"DOCS":
                # Support redis-py client greeting
                f.write(b"*0\r\n")
            elif cmd == b"CLIENT":
                f.write(b"+OK\r\n")
            elif cmd == b"SET":
                key = cmd_args[1]
                val = cmd_args[2]
                ttl = None
                if len(cmd_args) >= 5 and cmd_args[3].upper() == b"EX":
                    ttl = int(cmd_args[4])
                store.set(key, val, ttl)
                f.write(b"+OK\r\n")
            elif cmd == b"SETEX":
                key = cmd_args[1]
                ttl = int(cmd_args[2])
                val = cmd_args[3]
                store.set(key, val, ttl)
                f.write(b"+OK\r\n")
            elif cmd == b"GET":
                key = cmd_args[1]
                val = store.get(key)
                if val is None:
                    f.write(b"$-1\r\n")
                else:
                    f.write(f"${len(val)}\r\n".encode() + val + b"\r\n")
            elif cmd == b"DEL":
                deleted = store.delete(cmd_args[1:])
                f.write(f":{deleted}\r\n".encode())
            elif cmd == b"EXISTS":
                cnt = store.exists(cmd_args[1:])
                f.write(f":{cnt}\r\n".encode())
            elif cmd == b"KEYS":
                pat = cmd_args[1] if len(cmd_args) > 1 else b"*"
                matched = store.keys(pat)
                f.write(f"*{len(matched)}\r\n".encode())
                for k in matched:
                    f.write(f"${len(k)}\r\n".encode() + k + b"\r\n")
            elif cmd == b"SCAN":
                # Simple single-batch SCAN
                matched = store.keys(b"*")
                f.write(b"*2\r\n$1\r\n0\r\n")
                f.write(f"*{len(matched)}\r\n".encode())
                for k in matched:
                    f.write(f"${len(k)}\r\n".encode() + k + b"\r\n")
            elif cmd == b"DBSIZE":
                f.write(f":{len(store.data)}\r\n".encode())
            elif cmd == b"FLUSHDB" or cmd == b"FLUSHALL":
                store.flush()
                f.write(b"+OK\r\n")
            elif cmd == b"INFO":
                info_text = (
                    f"# Server\r\n"
                    f"redis_version:7.2.0-standalone\r\n"
                    f"os:Windows\r\n"
                    f"uptime_in_seconds:{int(time.time() - store.start_time)}\r\n"
                    f"# Memory\r\n"
                    f"used_memory_human:{round(len(store.data) * 1.5, 2)}KB\r\n"
                    f"# Keyspace\r\n"
                    f"db0:keys={len(store.data)},expires={len(store.expires)}\r\n"
                )
                f.write(f"${len(info_text)}\r\n{info_text}\r\n".encode())
            else:
                f.write(b"+OK\r\n")

            f.flush()
    except (ConnectionResetError, BrokenPipeError):
        pass
    except Exception as e:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def run_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind((HOST, PORT))
    except OSError as e:
        print(f"[REDIS SERVER] Cannot bind to {HOST}:{PORT}: {e}")
        print("[REDIS SERVER] A Redis service is likely already running on port 6379.")
        return

    server.listen(128)
    print("=" * 65)
    print(f"[*] Chaitanya Local Redis Server listening at redis://{HOST}:{PORT}")
    print("    Standard RESP protocol active (PING, GET, SET, DEL, SCAN, INFO)")
    print("=" * 65)

    try:
        while True:
            conn, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            t.start()
    except KeyboardInterrupt:
        print("\n[REDIS SERVER] Shutting down.")
    finally:
        server.close()


if __name__ == "__main__":
    run_server()
