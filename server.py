#!/usr/bin/env python3
import argparse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import subprocess
import threading
from urllib.parse import urlparse


PROJECT_ROOT = Path(__file__).resolve().parent
APP_DIR = PROJECT_ROOT / "web"
BACKUPS = PROJECT_ROOT / "data" / "backups"
PROGRAM = PROJECT_ROOT / "k08_program.py"
DECODER = PROJECT_ROOT / "k08_decode.py"
HID = PROJECT_ROOT / "bin" / "k08hid"
HID_LOCK = threading.Lock()
PROFILE_NAMES = ("Office", "Game I", "Game II", "Game III")

STATIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/app.css": ("app.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
}


def clean_error(output):
    text = (output or "").strip()
    if "K08 keyboard HID interface not found" in text:
        return "K08 не найдена. Переподключи клавиатуру и повтори чтение."
    if "not permitted" in text or "not privileged" in text:
        return "macOS не разрешила доступ к K08. Запусти приложение из терминала с доступом к устройствам ввода."
    for line in reversed(text.splitlines()):
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and payload.get("error"):
            return str(payload["error"])
    return text.splitlines()[-1] if text else "Операция с K08 не выполнена"


def run_process(args, expect_json=False):
    with HID_LOCK:
        result = subprocess.run(
            args,
            cwd=PROJECT_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    output = result.stdout.strip()
    if result.returncode:
        raise RuntimeError(clean_error(output))
    if not expect_json:
        return output
    try:
        payload = json.loads(output)
    except json.JSONDecodeError:
        payload = None
    if isinstance(payload, dict):
        return payload
    for line in reversed(output.splitlines()):
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            return payload
    raise RuntimeError("Утилита K08 вернула некорректный ответ")


def device_status():
    with HID_LOCK:
        result = subprocess.run(
            [str(HID), "list"],
            cwd=PROJECT_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    output = result.stdout.strip()
    if result.returncode:
        if "K08 keyboard HID interface not found" in output:
            return {
                "connected": False,
                "device": None,
                "active_layer": None,
                "profile_switch_supported": False,
            }
        raise RuntimeError(clean_error(output))
    connected = "usagePage=1 usage=6" in output
    active_layer = None
    if connected:
        profile_output = run_process([str(HID), "profile"])
        match = re.search(r"profile=(\d+)", profile_output)
        if match:
            profile = int(match.group(1))
            active_layer = profile + 1 if profile < len(PROFILE_NAMES) else None
    return {
        "connected": connected,
        "device": "VOROTEX K08" if connected else None,
        "active_layer": active_layer,
        "active_layer_name": PROFILE_NAMES[active_layer - 1] if active_layer else None,
        "profile_switch_supported": False,
    }


def sanitize_snapshot(snapshot):
    address_counts = {}
    for layer in snapshot.get("layers", []):
        for item in layer.get("keys", []):
            if item and item.get("valid"):
                address = item.get("macro_address")
                address_counts[address] = address_counts.get(address, 0) + 1

    layers = []
    for layer in snapshot.get("layers", []):
        keys = []
        for index, item in enumerate(layer.get("keys", []), start=1):
            if not item:
                keys.append({
                    "key": index,
                    "text": "",
                    "event_count": 0,
                    "macro_address": None,
                    "valid": False,
                    "shared_count": 0,
                })
                continue
            address = item.get("macro_address")
            keys.append({
                "key": item.get("key", index),
                "text": item.get("text", ""),
                "event_count": item.get("event_count", 0),
                "macro_address": f"0x{address:04x}" if isinstance(address, int) else None,
                "valid": bool(item.get("valid")),
                "shared_count": address_counts.get(address, 0),
            })
        layers.append({
            "layer": layer.get("layer"),
            "name": layer.get("name"),
            "keys": keys,
        })
    return {"layers": layers}


def list_backups():
    BACKUPS.mkdir(parents=True, exist_ok=True)
    backups = []
    for path in sorted(BACKUPS.glob("k08-backup-*.json"), key=lambda item: item.stat().st_mtime, reverse=True):
        stat = path.stat()
        backups.append({
            "name": path.name,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
            "size": stat.st_size,
        })
    return backups


def resolve_backup(name):
    value = str(name or "").strip()
    if not re.fullmatch(r"k08-backup-[0-9-]+\.json", value):
        raise ValueError("Выбери резервную копию K08 из списка")
    path = (BACKUPS / value).resolve()
    if path.parent != BACKUPS.resolve() or not path.is_file():
        raise ValueError("Файл резервной копии не найден")
    return path


class Handler(BaseHTTPRequestHandler):
    server_version = "K08Writer/2.1"

    def log_message(self, fmt, *args):
        return

    def send_bytes(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_bytes(status, body, "application/json; charset=utf-8")

    def send_static(self, path):
        target = STATIC_FILES.get(path)
        if not target:
            return False
        filename, content_type = target
        file_path = APP_DIR / filename
        if not file_path.is_file():
            self.send_json(500, {"error": f"Не найден файл интерфейса {filename}"})
            return True
        self.send_bytes(200, file_path.read_bytes(), content_type)
        return True

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 65536:
            raise ValueError("Запрос слишком большой")
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self):
        path = urlparse(self.path).path
        if self.send_static(path):
            return
        if path == "/favicon.ico":
            self.send_bytes(204, b"", "image/x-icon")
            return
        try:
            if path == "/api/status":
                self.send_json(200, device_status())
                return
            if path == "/api/layers":
                snapshot = run_process(["python3", str(DECODER), "--json"], expect_json=True)
                self.send_json(200, sanitize_snapshot(snapshot))
                return
            if path == "/api/backups":
                self.send_json(200, {"backups": list_backups()})
                return
        except Exception as error:
            self.send_json(500, {"error": str(error)})
            return
        self.send_json(404, {"error": "Маршрут не найден"})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            data = self.read_json()
            if path == "/api/backup":
                payload = run_process(["python3", str(PROGRAM), "backup", "--json"], expect_json=True)
                payload["backup"] = Path(payload["backup"]).name
                self.send_json(200, payload)
                return

            if path in ("/api/write", "/api/clear"):
                layer = int(data.get("layer", 0))
                key = int(data.get("key", 0))
                if not 1 <= layer <= 4 or not 1 <= key <= 8:
                    raise ValueError("Выбери профиль 1–4 и кнопку K1–K8")
                command = "write" if path == "/api/write" else "clear"
                args = [
                    "python3", str(PROGRAM), command,
                    "--layer", str(layer), "--key", str(key), "--yes", "--json",
                ]
                if command == "write":
                    args.extend(["--text", str(data.get("text", "")), "--address", "auto"])
                args.append("--commit")
                payload = run_process(args, expect_json=True)
                payload["backup"] = Path(payload["backup"]).name
                self.send_json(200, payload)
                return

            if path == "/api/copy-layer":
                source = int(data.get("source", 0))
                target = int(data.get("target", 0))
                args = [
                    "python3", str(PROGRAM), "copy-layer",
                    "--source", str(source), "--target", str(target),
                    "--yes", "--json", "--commit",
                ]
                payload = run_process(args, expect_json=True)
                payload["backup"] = Path(payload["backup"]).name
                self.send_json(200, payload)
                return

            if path == "/api/restore":
                backup = resolve_backup(data.get("backup"))
                args = [
                    "python3", str(PROGRAM), "restore",
                    "--backup", str(backup), "--yes", "--json", "--commit",
                ]
                payload = run_process(args, expect_json=True)
                payload["backup"] = backup.name
                self.send_json(200, payload)
                return
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": str(error)})
            return
        except Exception as error:
            self.send_json(500, {"error": str(error)})
            return
        self.send_json(404, {"error": "Маршрут не найден"})


def main():
    parser = argparse.ArgumentParser(description="VOROTEX K08 memory editor for macOS")
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()
    if not HID.is_file():
        parser.error("Не найден bin/k08hid. Сначала выполни: make build")
    ThreadingHTTPServer.daemon_threads = True
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
