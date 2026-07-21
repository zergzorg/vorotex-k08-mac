import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "k08_program.py"
SPEC = importlib.util.spec_from_file_location("k08_program", MODULE_PATH)
k08 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(k08)


class EncodeTests(unittest.TestCase):
    def test_text_and_tokens_use_expected_event_count(self):
        count, payload = k08.encode_text("ab{TAB}C{ENTER}")

        self.assertEqual(count, 12)
        self.assertEqual(payload[:2], b"\x01\x00")
        self.assertEqual(payload[-2:], b"\x00\x00")

    def test_unsupported_character_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "не поддержан"):
            k08.encode_text("пароль")


class AllocationTests(unittest.TestCase):
    def test_allocator_skips_referenced_macro(self):
        references = [{"start": 0x0520, "end": 0x0560}]
        with patch.object(k08, "descriptor_references", return_value=references):
            self.assertEqual(k08.find_free_address(32), 0x0560)

    def test_allocator_reuses_unreferenced_block(self):
        with patch.object(k08, "descriptor_references", return_value=[]):
            self.assertEqual(k08.find_free_address(32), 0x0520)


class OperationTests(unittest.TestCase):
    def test_office_profile_is_first_binding_table(self):
        self.assertEqual(k08.BINDING_BASES, [0x00A1, 0x012D, 0x01B9, 0x0245])

    def test_clear_rejects_key_outside_device(self):
        with self.assertRaisesRegex(ValueError, "от 1 до 8"):
            k08.clear_operations("2", 9)

    def test_copy_rejects_same_layer(self):
        with self.assertRaisesRegex(ValueError, "должны отличаться"):
            k08.copy_layer_operations(2, 2)

    def test_verification_reads_large_table_in_hid_sized_chunks(self):
        payload = bytes(range(80))

        def fake_read(address, count):
            offset = address - 0x0200
            self.assertLessEqual(count, 32)
            return list(payload[offset:offset + count])

        with patch.object(k08, "run_read", side_effect=fake_read) as mocked:
            k08.verify_operations([(0x0200, payload, "layer table")])

        self.assertEqual([call.args[1] for call in mocked.call_args_list], [32, 32, 16])


if __name__ == "__main__":
    unittest.main()
