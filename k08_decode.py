#!/usr/bin/env python3
import argparse
import fcntl
import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
HID_TOOL = ROOT / "bin" / "k08hid"
LOCK_PATH = DATA_DIR / ".k08hid.lock"

LAYER_BASES = [0x00A1, 0x012D, 0x01B9, 0x0245]
LAYER_NAMES = ["Office", "Game I", "Game II", "Game III"]

USAGE_NAMES = {
    0x04: "A", 0x05: "B", 0x06: "C", 0x07: "D", 0x08: "E", 0x09: "F",
    0x0A: "G", 0x0B: "H", 0x0C: "I", 0x0D: "J", 0x0E: "K", 0x0F: "L",
    0x10: "M", 0x11: "N", 0x12: "O", 0x13: "P", 0x14: "Q", 0x15: "R",
    0x16: "S", 0x17: "T", 0x18: "U", 0x19: "V", 0x1A: "W", 0x1B: "X",
    0x1C: "Y", 0x1D: "Z",
    0x1E: "1", 0x1F: "2", 0x20: "3", 0x21: "4", 0x22: "5", 0x23: "6",
    0x24: "7", 0x25: "8", 0x26: "9", 0x27: "0",
    0x28: "ENTER", 0x29: "ESC", 0x2A: "BACKSPACE", 0x2B: "TAB", 0x2C: "SPACE",
    0x2D: "-", 0x2E: "=", 0x2F: "[", 0x30: "]", 0x31: "\\", 0x33: ";",
    0x34: "'", 0x35: "`", 0x36: ",", 0x37: ".", 0x38: "/",
    0x3A: "F1", 0x3B: "F2", 0x3C: "F3", 0x3D: "F4", 0x3E: "F5",
    0x3F: "F6", 0x40: "F7", 0x41: "F8", 0x42: "F9", 0x43: "F10",
    0x44: "F11", 0x45: "F12",
    0x4C: "DELETE",
    0xE0: "LCTRL", 0xE1: "LSHIFT", 0xE2: "LALT", 0xE3: "LGUI",
    0xE4: "RCTRL", 0xE5: "RSHIFT", 0xE6: "RALT", 0xE7: "RGUI",
}

UNSHIFTED = {
    0x04: "a", 0x05: "b", 0x06: "c", 0x07: "d", 0x08: "e", 0x09: "f",
    0x0A: "g", 0x0B: "h", 0x0C: "i", 0x0D: "j", 0x0E: "k", 0x0F: "l",
    0x10: "m", 0x11: "n", 0x12: "o", 0x13: "p", 0x14: "q", 0x15: "r",
    0x16: "s", 0x17: "t", 0x18: "u", 0x19: "v", 0x1A: "w", 0x1B: "x",
    0x1C: "y", 0x1D: "z",
    0x1E: "1", 0x1F: "2", 0x20: "3", 0x21: "4", 0x22: "5", 0x23: "6",
    0x24: "7", 0x25: "8", 0x26: "9", 0x27: "0",
    0x2C: " ", 0x2D: "-", 0x2E: "=", 0x2F: "[", 0x30: "]", 0x31: "\\",
    0x33: ";", 0x34: "'", 0x35: "`", 0x36: ",", 0x37: ".", 0x38: "/",
}

SHIFTED = {
    **{usage: char.upper() for usage, char in UNSHIFTED.items() if char.isalpha()},
    0x1E: "!", 0x1F: "@", 0x20: "#", 0x21: "$", 0x22: "%", 0x23: "^",
    0x24: "&", 0x25: "*", 0x26: "(", 0x27: ")", 0x2D: "_", 0x2E: "+",
    0x2F: "{", 0x30: "}", 0x31: "|", 0x33: ":", 0x34: '"', 0x35: "~",
    0x36: "<", 0x37: ">", 0x38: "?",
}

MODIFIERS = {0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7}
MODIFIER_LABELS = {
    0xE0: "CTRL", 0xE4: "CTRL",
    0xE1: "SHIFT", 0xE5: "SHIFT",
    0xE2: "ALT", 0xE6: "ALT",
    0xE3: "WIN", 0xE7: "WIN",
}


def run_read(address, count):
    result = subprocess.run(
        [str(HID_TOOL), "read", hex(address), str(count)],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    values = {}
    for line in result.stdout.splitlines():
        match = re.match(r"^([0-9a-f]{4}):((?: [0-9a-f]{2})+)", line)
        if not match:
            continue
        base = int(match.group(1), 16)
        for offset, byte in enumerate(match.group(2).strip().split()):
            values[base + offset] = int(byte, 16)
    return values


def read_bytes(address, count):
    memory = {}
    for offset in range(0, count, 0x20):
        size = min(0x20, count - offset)
        memory.update(run_read(address + offset, size))
    return bytes(memory.get(address + offset, 0) for offset in range(count))


def read_range(start, end):
    return read_bytes(start, end - start)


def name_usage(value):
    return USAGE_NAMES.get(value, f"0x{value:02x}")


def decode_event_pairs(raw, count):
    events = []
    pos = 2 if len(raw) >= 2 and raw[:2] == b"\x01\x00" else 0
    limit = len(raw)
    event_limit = count & 0x7F
    while pos + 1 < limit and len(events) < event_limit:
        op = raw[pos]
        arg = raw[pos + 1]
        if op == 0x00 and arg == 0x00:
            break
        if op in (0x81, 0x01, 0x84):
            kind = {0x81: "down", 0x01: "up", 0x84: "tap"}[op]
            events.append({"kind": kind, "usage": arg, "name": name_usage(arg)})
        elif op == 0x8A:
            events.append({"kind": "delay", "value": arg, "name": f"delay {arg}"})
        else:
            events.append({"kind": f"op{op:02x}", "usage": arg, "name": f"op{op:02x} {name_usage(arg)}"})
        pos += 2
    return events


def event_text(events):
    parts = []
    active_modifiers = []

    def add_key(usage):
        labels = [MODIFIER_LABELS[value] for value in active_modifiers if value in MODIFIER_LABELS]
        shift_only = labels and all(label == "SHIFT" for label in labels)
        if shift_only and usage in SHIFTED:
            parts.append(SHIFTED[usage])
        elif labels:
            compact = []
            for label in labels:
                if label not in compact:
                    compact.append(label)
            parts.append("{" + "+".join(compact + [name_usage(usage)]) + "}")
        elif usage in UNSHIFTED:
            parts.append(UNSHIFTED[usage])
        elif usage == 0x28:
            parts.append("{ENTER}")
        elif usage == 0x2B:
            parts.append("{TAB}")
        elif usage == 0x29:
            parts.append("{ESC}")
        elif usage == 0x2A:
            parts.append("{BACKSPACE}")
        elif usage == 0x4C:
            parts.append("{DELETE}")
        else:
            parts.append("{" + name_usage(usage) + "}")

    for event in events:
        kind = event["kind"]
        usage = event.get("usage")
        if kind == "down" and usage in MODIFIERS:
            active_modifiers.append(usage)
        elif kind == "up" and usage in active_modifiers:
            active_modifiers.remove(usage)
        elif kind == "down":
            add_key(usage)
        elif kind == "tap":
            add_key(usage)
        elif kind not in ("up",):
            parts.append("[" + event["name"] + "]")
    return "".join(parts)


def decode_descriptor(memory, base, index):
    pos = base + index * 10
    chunk = memory[pos:pos + 10]
    if len(chunk) < 10 or not any(chunk):
        return None
    address = chunk[4] | (chunk[5] << 8)
    return {
        "key": index + 1,
        "index": index,
        "desc_address": pos,
        "count": chunk[0],
        "event_count": chunk[0] & 0x7F,
        "flag_high": bool(chunk[0] & 0x80),
        "kind": chunk[1],
        "flags": chunk[2] | (chunk[3] << 8),
        "macro_address": address,
        "repeat": chunk[7],
        "tail": list(chunk[8:10]),
        "raw": list(chunk),
    }


def decode_entry(item):
    if not item:
        return None
    if item["macro_address"] < 0x0400 or item["macro_address"] >= 0x0800:
        return {
            **item,
            "valid": False,
            "raw_hex": " ".join(f"{value:02x}" for value in item["raw"]),
            "macro_head_hex": "",
            "events": [],
            "events_preview": "",
            "text": "{SPECIAL}",
        }
    raw_len = max(32, min(160, 2 + item["event_count"] * 2 + 2))
    macro_raw = read_bytes(item["macro_address"], raw_len)
    events = decode_event_pairs(macro_raw, item["count"])
    return {
        **item,
        "valid": True,
        "raw_hex": " ".join(f"{value:02x}" for value in item["raw"]),
        "macro_head_hex": " ".join(f"{value:02x}" for value in macro_raw[:32]),
        "events": events,
        "events_preview": ", ".join(event["name"] if event["kind"] == "tap" else f"{event['kind']} {event.get('name', event.get('value', ''))}" for event in events[:10]),
        "text": event_text(events),
    }


def snapshot():
    low = read_range(0x000, 0x300)
    layers = []
    for layer_index, base in enumerate(LAYER_BASES, start=1):
        keys = []
        for index in range(8):
            keys.append(decode_entry(decode_descriptor(low, base, index)))
        layers.append({
            "layer": layer_index,
            "name": LAYER_NAMES[layer_index - 1],
            "base": base,
            "keys": keys,
        })

    return {"layers": layers}


def print_entry(prefix, item):
    if not item:
        return
    print(
        f"{prefix} K{item['key']}: desc@0x{item['desc_address']:04x} "
        f"events={item['event_count']} macro@0x{item['macro_address']:04x} "
        f"repeat={item['repeat']} text={item['text']!r}"
    )


def print_snapshot(data):
    for layer in data["layers"]:
        print(f"profile {layer['layer']} {layer['name']} @ 0x{layer['base']:04x}")
        for item in layer["keys"]:
            print_entry(" ", item)
        print()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="print structured layer data")
    args = parser.parse_args()

    if not HID_TOOL.exists():
        print(f"Не найден {HID_TOOL}", file=sys.stderr)
        return 1

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with LOCK_PATH.open("w") as lock_file:
        fcntl.flock(lock_file, fcntl.LOCK_EX)
        data = snapshot()
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print_snapshot(data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
