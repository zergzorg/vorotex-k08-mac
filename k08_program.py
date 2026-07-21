#!/usr/bin/env python3
import argparse
import fcntl
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
BACKUPS = DATA_DIR / "backups"
HID_TOOL = ROOT / "bin" / "k08hid"
LOCK_PATH = DATA_DIR / ".k08hid.lock"

BINDING_BASES = [0x00A1, 0x012D, 0x01B9, 0x0245]
MACRO_ALLOC_START = 0x0520
MACRO_ALLOC_END = 0x0800
DEFAULT_MACRO_ADDRESS = "auto"
DEFAULT_REPEAT = 0x0A

SHIFT = 0xE1
CTRL = 0xE0
ALT = 0xE2
GUI = 0xE3

CHAR_TO_USAGE = {
    "a": (0x04, False), "b": (0x05, False), "c": (0x06, False), "d": (0x07, False),
    "e": (0x08, False), "f": (0x09, False), "g": (0x0A, False), "h": (0x0B, False),
    "i": (0x0C, False), "j": (0x0D, False), "k": (0x0E, False), "l": (0x0F, False),
    "m": (0x10, False), "n": (0x11, False), "o": (0x12, False), "p": (0x13, False),
    "q": (0x14, False), "r": (0x15, False), "s": (0x16, False), "t": (0x17, False),
    "u": (0x18, False), "v": (0x19, False), "w": (0x1A, False), "x": (0x1B, False),
    "y": (0x1C, False), "z": (0x1D, False),
    "1": (0x1E, False), "2": (0x1F, False), "3": (0x20, False), "4": (0x21, False),
    "5": (0x22, False), "6": (0x23, False), "7": (0x24, False), "8": (0x25, False),
    "9": (0x26, False), "0": (0x27, False),
    "\n": (0x28, False), "\t": (0x2B, False), " ": (0x2C, False),
    "-": (0x2D, False), "=": (0x2E, False), "[": (0x2F, False), "]": (0x30, False),
    "\\": (0x31, False), ";": (0x33, False), "'": (0x34, False), "`": (0x35, False),
    ",": (0x36, False), ".": (0x37, False), "/": (0x38, False),
    "!": (0x1E, True), "@": (0x1F, True), "#": (0x20, True), "$": (0x21, True),
    "%": (0x22, True), "^": (0x23, True), "&": (0x24, True), "*": (0x25, True),
    "(": (0x26, True), ")": (0x27, True), "_": (0x2D, True), "+": (0x2E, True),
    "{": (0x2F, True), "}": (0x30, True), "|": (0x31, True), ":": (0x33, True),
    '"': (0x34, True), "~": (0x35, True), "<": (0x36, True), ">": (0x37, True),
    "?": (0x38, True),
}

TOKEN_TO_EVENTS = {
    "ENTER": [(0x81, 0x28), (0x01, 0x28)],
    "TAB": [(0x81, 0x2B), (0x01, 0x2B)],
    "ESC": [(0x81, 0x29), (0x01, 0x29)],
    "BACKSPACE": [(0x81, 0x2A), (0x01, 0x2A)],
    "DELETE": [(0x81, 0x4C), (0x01, 0x4C)],
    "ALT+TAB": [(0x81, ALT), (0x81, 0x2B), (0x01, 0x2B), (0x01, ALT)],
    "WIN+TAB": [(0x81, GUI), (0x81, 0x2B), (0x01, 0x2B), (0x01, GUI)],
    "CMD+TAB": [(0x81, GUI), (0x81, 0x2B), (0x01, 0x2B), (0x01, GUI)],
    "CTRL+A": [(0x81, CTRL), (0x81, 0x04), (0x01, 0x04), (0x01, CTRL)],
    "CTRL+C": [(0x81, CTRL), (0x81, 0x06), (0x01, 0x06), (0x01, CTRL)],
    "CTRL+V": [(0x81, CTRL), (0x81, 0x19), (0x01, 0x19), (0x01, CTRL)],
    "CTRL+X": [(0x81, CTRL), (0x81, 0x1B), (0x01, 0x1B), (0x01, CTRL)],
}


def parse_int(value):
    return int(value, 0)


def align32(value):
    return (value + 31) & ~31


def hex_bytes(values):
    return " ".join(f"{value:02x}" for value in values)


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
    return [values.get(address + offset, 0) for offset in range(count)]


def run_write(address, values):
    result = subprocess.run(
        [str(HID_TOOL), "write-hex", hex(address), hex_bytes(values)],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise RuntimeError(f"Ошибка записи блока памяти 0x{address:04x}")


def run_commit():
    result = subprocess.run(
        [str(HID_TOOL), "commit"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise RuntimeError("Память записана, но команда применения профиля не выполнена")


def read_range(start, end):
    out = []
    for address in range(start, end, 0x20):
        out.extend(run_read(address, min(0x20, end - address)))
    return out


def create_backup():
    BACKUPS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    path = BACKUPS / f"k08-backup-{stamp}.json"
    data = {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "device": "VOROTEX K08 / INSTANT 30fa:1340",
        "ranges": {
            "0000-02ff": read_range(0x0000, 0x0300),
            "0400-07ff": read_range(0x0400, 0x0800),
        },
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def encode_char(ch):
    if ch.isalpha() and ch.upper() == ch and ch.lower() in CHAR_TO_USAGE:
        usage, shifted = CHAR_TO_USAGE[ch.lower()]
        shifted = True
    else:
        if ch not in CHAR_TO_USAGE:
            raise ValueError(f"Символ {ch!r} пока не поддержан для прямой HID-записи")
        usage, shifted = CHAR_TO_USAGE[ch]

    if shifted:
        return [(0x81, SHIFT), (0x81, usage), (0x01, usage), (0x01, SHIFT)]
    return [(0x81, usage), (0x01, usage)]


def encode_text(text):
    events = []
    pos = 0
    while pos < len(text):
        if text[pos] == "{":
            end = text.find("}", pos + 1)
            if end != -1:
                token = text[pos + 1:end].strip().upper()
                if token in TOKEN_TO_EVENTS:
                    events.extend(TOKEN_TO_EVENTS[token])
                    pos = end + 1
                    continue
        events.extend(encode_char(text[pos]))
        pos += 1

    if len(events) > 0x7F:
        raise ValueError("Макрос слишком длинный: максимум 127 HID-событий в подтвержденном формате")

    raw = bytearray([0x01, 0x00])
    for op, arg in events:
        raw.extend([op, arg])
    raw.extend([0x00, 0x00])
    return len(events), bytes(raw)


def descriptor_references(exclude_layer=None, exclude_key=None):
    low = read_range(0x0000, 0x0300)
    references = []
    tables = [
        (f"layer-{index}", base, index)
        for index, base in enumerate(BINDING_BASES, start=1)
    ]

    for table_name, base, layer in tables:
        for key_index in range(8):
            key = key_index + 1
            if layer == exclude_layer and key == exclude_key:
                continue
            descriptor = low[base + key_index * 10:base + (key_index + 1) * 10]
            if len(descriptor) != 10:
                continue
            event_count = descriptor[0] & 0x7F
            address = descriptor[4] | (descriptor[5] << 8)
            if not event_count or not 0x0400 <= address < MACRO_ALLOC_END:
                continue
            body_length = align32(2 + event_count * 2 + 2)
            references.append({
                "table": table_name,
                "key": key,
                "start": address,
                "end": min(address + body_length, MACRO_ALLOC_END),
            })
    return references


def ranges_overlap(left_start, left_end, right_start, right_end):
    return left_start < right_end and right_start < left_end


def find_free_address(length, exclude_layer=None, exclude_key=None):
    needed = align32(length)
    references = descriptor_references(exclude_layer, exclude_key)
    for address in range(MACRO_ALLOC_START, MACRO_ALLOC_END - needed + 1, 0x20):
        if all(
            not ranges_overlap(address, address + needed, item["start"], item["end"])
            for item in references
        ):
            return address
    raise RuntimeError("В памяти K08 не осталось места для этого макроса")


def make_descriptor(event_count, address, repeat):
    if not 0 <= event_count <= 0x7F:
        raise ValueError("event_count out of range")
    if not 0 <= address <= 0xFFFF:
        raise ValueError("address out of range")
    if not 0 <= repeat <= 0xFF:
        raise ValueError("repeat out of range")
    return bytes([
        event_count, 0xFF, 0x00, 0x00,
        address & 0xFF, (address >> 8) & 0xFF,
        0x00, repeat, 0x00, 0x00,
    ])


def selected_binding_bases(layer):
    if str(layer).lower() == "all":
        return BINDING_BASES
    layer_num = int(layer)
    if not 1 <= layer_num <= len(BINDING_BASES):
        raise ValueError("Профиль должен быть 1, 2, 3, 4 или all")
    return [BINDING_BASES[layer_num - 1]]


def resolve_macro_address(address, payload_len, layer, key):
    if isinstance(address, int):
        return address
    if str(address).strip().lower() == "auto":
        layer_number = None if str(layer).lower() == "all" else int(layer)
        return find_free_address(payload_len, layer_number, key)
    return parse_int(str(address))


def planned_operations(key, text, address, repeat, layer):
    if not 1 <= key <= 8:
        raise ValueError("Кнопка должна быть от 1 до 8")
    event_count, macro = encode_text(text)
    clear_len = align32(len(macro))
    macro_payload = macro + bytes(clear_len - len(macro))
    address = resolve_macro_address(address, len(macro), layer, key)
    descriptor = make_descriptor(event_count, address, repeat)

    operations = [(address, macro_payload, "macro body")]
    for base in selected_binding_bases(layer):
        layer_num = BINDING_BASES.index(base) + 1
        operations.append((base + (key - 1) * 10, descriptor, f"layer {layer_num} key {key} binding"))
    return event_count, operations


def clear_operations(layer, key):
    if not 1 <= key <= 8:
        raise ValueError("Кнопка должна быть от 1 до 8")
    bases = selected_binding_bases(layer)
    operations = []
    for base in bases:
        layer_num = BINDING_BASES.index(base) + 1
        operations.append((base + (key - 1) * 10, bytes(10), f"layer {layer_num} key {key} binding"))
    return operations


def copy_layer_operations(source_layer, target_layer):
    if source_layer == target_layer:
        raise ValueError("Исходный и целевой слои должны отличаться")
    if not 1 <= source_layer <= 4 or not 1 <= target_layer <= 4:
        raise ValueError("Профиль должен быть от 1 до 4")
    source_base = BINDING_BASES[source_layer - 1]
    target_base = BINDING_BASES[target_layer - 1]
    table = bytes(read_range(source_base, source_base + 80))
    return [(target_base, table, f"copy layer {source_layer} to layer {target_layer}")]


def verify_operations(operations):
    for address, expected, label in operations:
        actual = bytes(read_range(address, address + len(expected)))
        if actual != expected:
            raise RuntimeError(
                f"Проверка не прошла для {label} @ 0x{address:04x}: "
                f"ожидалось {hex_bytes(expected)}, прочитано {hex_bytes(actual)}"
            )


def range_name_to_start(name):
    start_text = name.split("-", 1)[0]
    return int(start_text, 16)


def backup_to_operations(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    operations = []
    for name, values in data["ranges"].items():
        operations.append((range_name_to_start(name), bytes(values), f"restore {name}"))
    return operations


def print_operations(event_count, operations):
    print(f"HID events: {event_count}")
    for address, values, label in operations:
        print(f"0x{address:04x} {label}: {hex_bytes(values)}")


def write_operations(operations, commit):
    for address, values, _label in operations:
        for offset in range(0, len(values), 32):
            run_write(address + offset, values[offset:offset + 32])
    verify_operations(operations)
    if commit:
        run_commit()


def emit_json(payload):
    print(json.dumps(payload, ensure_ascii=False))


def cmd_backup(args):
    path = create_backup()
    if args.json:
        emit_json({"ok": True, "action": "backup", "backup": str(path)})
    else:
        print(path)


def cmd_plan(args):
    event_count, operations = planned_operations(args.key, args.text, args.address, args.repeat, args.layer)
    if args.json:
        emit_json({
            "ok": True,
            "action": "plan",
            "layer": args.layer,
            "key": args.key,
            "event_count": event_count,
            "macro_address": f"0x{operations[0][0]:04x}",
            "bytes_to_write": sum(len(values) for _address, values, _label in operations),
        })
    else:
        print_operations(event_count, operations)


def cmd_write(args):
    event_count, operations = planned_operations(args.key, args.text, args.address, args.repeat, args.layer)
    if not args.json:
        print_operations(event_count, operations)
    if not args.yes:
        if args.json:
            emit_json({"ok": True, "action": "dry-run", "event_count": event_count})
        else:
            print("Сухой режим: добавь --yes для реальной записи.")
        return

    backup_path = create_backup()
    write_operations(operations, args.commit)
    if args.json:
        emit_json({
            "ok": True,
            "action": "write",
            "layer": args.layer,
            "key": args.key,
            "event_count": event_count,
            "macro_address": f"0x{operations[0][0]:04x}",
            "backup": str(backup_path),
            "committed": args.commit,
        })
    else:
        print(f"backup: {backup_path}")
        print("write verified")


def cmd_clear(args):
    operations = clear_operations(args.layer, args.key)
    if not args.yes:
        if args.json:
            emit_json({"ok": True, "action": "dry-run"})
        else:
            print("Сухой режим: добавь --yes для реальной очистки.")
        return
    backup_path = create_backup()
    write_operations(operations, args.commit)
    if args.json:
        emit_json({
            "ok": True,
            "action": "clear",
            "layer": args.layer,
            "key": args.key,
            "backup": str(backup_path),
            "committed": args.commit,
        })
    else:
        print(f"backup: {backup_path}")
        print("binding cleared and verified")


def cmd_copy_layer(args):
    operations = copy_layer_operations(args.source, args.target)
    if not args.yes:
        if args.json:
            emit_json({"ok": True, "action": "dry-run"})
        else:
            print("Сухой режим: добавь --yes для реального копирования.")
        return
    backup_path = create_backup()
    write_operations(operations, args.commit)
    if args.json:
        emit_json({
            "ok": True,
            "action": "copy-layer",
            "source": args.source,
            "target": args.target,
            "backup": str(backup_path),
            "committed": args.commit,
        })
    else:
        print(f"backup: {backup_path}")
        print("layer copied and verified")


def cmd_restore(args):
    operations = backup_to_operations(args.backup)
    if not args.json:
        for address, values, label in operations:
            print(f"0x{address:04x} {label}: {len(values)} bytes")
    if not args.yes:
        if args.json:
            emit_json({"ok": True, "action": "dry-run"})
        else:
            print("Сухой режим: добавь --yes для реального восстановления.")
        return

    write_operations(operations, args.commit)
    if args.json:
        emit_json({"ok": True, "action": "restore", "backup": str(args.backup), "committed": args.commit})
    else:
        print("restore verified")


def build_parser():
    parser = argparse.ArgumentParser(description="VOROTEX K08 onboard macro writer for macOS")
    sub = parser.add_subparsers(required=True)

    backup = sub.add_parser("backup", help="сохранить дамп EEPROM-областей в data/backups")
    backup.add_argument("--json", action="store_true", help="машиночитаемый вывод без дампа макроса")
    backup.set_defaults(func=cmd_backup)

    plan = sub.add_parser("plan", help="показать байты для записи, не меняя клавиатуру")
    plan.add_argument("--key", type=int, required=True, help="физическая кнопка 1..8")
    plan.add_argument("--layer", default="1", help="профиль 1, 2, 3, 4 или all")
    plan.add_argument("--text", required=True, help="ASCII-текст макроса")
    plan.add_argument("--address", default=DEFAULT_MACRO_ADDRESS, help="адрес макроса или auto")
    plan.add_argument("--repeat", type=parse_int, default=DEFAULT_REPEAT, help="байт repeat из дескриптора")
    plan.add_argument("--json", action="store_true", help="машиночитаемый вывод без дампа макроса")
    plan.set_defaults(func=cmd_plan)

    write = sub.add_parser("write", help="записать макрос в память клавиатуры")
    write.add_argument("--key", type=int, required=True, help="физическая кнопка 1..8")
    write.add_argument("--layer", default="1", help="профиль 1, 2, 3, 4 или all")
    write.add_argument("--text", required=True, help="ASCII-текст макроса")
    write.add_argument("--address", default=DEFAULT_MACRO_ADDRESS, help="адрес макроса или auto")
    write.add_argument("--repeat", type=parse_int, default=DEFAULT_REPEAT, help="байт repeat из дескриптора")
    write.add_argument("--commit", action="store_true", help="после записи отправить команду применения профиля")
    write.add_argument("--yes", action="store_true", help="подтверждение реальной записи")
    write.add_argument("--json", action="store_true", help="машиночитаемый вывод без дампа макроса")
    write.set_defaults(func=cmd_write)

    clear = sub.add_parser("clear", help="очистить назначение кнопки выбранного профиля")
    clear.add_argument("--key", type=int, required=True, help="физическая кнопка 1..8")
    clear.add_argument("--layer", required=True, help="профиль 1, 2, 3, 4 или all")
    clear.add_argument("--commit", action="store_true", help="после записи отправить команду применения профиля")
    clear.add_argument("--yes", action="store_true", help="подтверждение реальной очистки")
    clear.add_argument("--json", action="store_true", help="машиночитаемый вывод")
    clear.set_defaults(func=cmd_clear)

    copy_layer = sub.add_parser("copy-layer", help="скопировать таблицу назначений между профилями")
    copy_layer.add_argument("--source", type=int, required=True, help="исходный профиль 1..4")
    copy_layer.add_argument("--target", type=int, required=True, help="целевой профиль 1..4")
    copy_layer.add_argument("--commit", action="store_true", help="после записи отправить команду применения профиля")
    copy_layer.add_argument("--yes", action="store_true", help="подтверждение реального копирования")
    copy_layer.add_argument("--json", action="store_true", help="машиночитаемый вывод")
    copy_layer.set_defaults(func=cmd_copy_layer)

    restore = sub.add_parser("restore", help="восстановить EEPROM-области из backup json")
    restore.add_argument("--backup", required=True, help="путь к k08-backup-*.json")
    restore.add_argument("--commit", action="store_true", help="после восстановления отправить команду применения профиля")
    restore.add_argument("--yes", action="store_true", help="подтверждение реального восстановления")
    restore.add_argument("--json", action="store_true", help="машиночитаемый вывод")
    restore.set_defaults(func=cmd_restore)
    return parser


def main():
    args = build_parser().parse_args()
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with LOCK_PATH.open("w") as lock_file:
            fcntl.flock(lock_file, fcntl.LOCK_EX)
            args.func(args)
    except Exception as error:
        if getattr(args, "json", False):
            print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
            return 1
        raise
    return 0


if __name__ == "__main__":
    main()
