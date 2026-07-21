# Security and private data

VOROTEX K08 macro memory and this application's EEPROM backups are not encrypted. Treat every file under `data/` as sensitive because it may encode passwords, access tokens, commands, or other personal text.

## Reporting a vulnerability

Open a GitHub security advisory or a sanitized issue. Do not publish EEPROM dumps, real macros, credentials, or raw logs containing them.

## Before contributing

Run `git status --short` and inspect `git diff --cached` before every commit. The repository ignores `data/`, `k08-backup-*.json`, dumps, logs, environment files, and the locally compiled HID binary. Do not bypass those rules with `git add --force`.
