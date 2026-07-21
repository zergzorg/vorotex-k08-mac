# VOROTEX K08 macOS Memory Editor

[English](#english) · [Русский](#русский) · [中文](#中文)

## English

An unofficial open-source editor for the onboard memory of the VOROTEX K08 eight-key macro keypad. It runs locally on macOS, reads all four hardware profiles, and writes macros directly to the keypad so they continue working on another computer without this application.

The project was tested with a K08 reporting USB VID/PID `30fa:1340`. Other revisions may use a different protocol and are not supported yet.

### Features

- Reads the `Office`, `Game I`, `Game II`, and `Game III` profiles.
- Shows assignments for all eight keys in each profile.
- Writes text and common keyboard actions to onboard memory.
- Copies a complete profile, clears individual keys, and restores backups.
- Creates an automatic EEPROM backup before every change.
- Verifies every write by reading the changed bytes back from the device.
- Serves the interface locally on `127.0.0.1`; no cloud service is involved.
- Provides English, Russian, and Simplified Chinese interface languages.

Supported action tokens include `{TAB}`, `{ENTER}`, `{ESC}`, `{BACKSPACE}`, `{DELETE}`, `{CMD+TAB}`, `{ALT+TAB}`, and common `CTRL` shortcuts. Text input currently supports characters available through the US English HID keyboard layout.

### Install and run

Requirements: macOS, Python 3, and Apple Command Line Tools with `clang` and `make`.

```bash
xcode-select --install
git clone https://github.com/zergzorg/vorotex-k08-mac.git
cd vorotex-k08-mac
make run
```

Open [http://127.0.0.1:8788](http://127.0.0.1:8788). If macOS denies HID access, allow your terminal application under **System Settings → Privacy & Security → Input Monitoring**, then restart the program.

The profile marked as active is the profile currently used by the keypad. Editing another profile does not switch the hardware to it.

### Privacy and safety

K08 macro memory is **not encrypted**. Anyone with access to the keypad can read stored logins, passwords, commands, and tokens. Local backups contain the same sensitive data in raw form.

- Backups are stored only in `data/backups/`.
- The entire `data/` directory is ignored by Git.
- Macro values are hidden by default in the interface.
- This repository contains no device dumps, personal assignments, credentials, vendor executables, or proprietary Windows drivers.

Keep a backup, do not disconnect the keypad during a write, and use this software only with hardware you own. The project is not affiliated with or endorsed by VOROTEX.

## Русский

Неофициальный редактор встроенной памяти восьмиклавишного макропада VOROTEX K08 с открытым исходным кодом. Программа локально работает на macOS, читает все четыре аппаратных профиля и записывает макросы непосредственно в клавиатуру. После записи назначения работают на другом компьютере без запуска приложения.

Проект проверен на K08 с USB VID/PID `30fa:1340`. Другие ревизии устройства могут использовать иной протокол и пока не поддерживаются.

### Возможности

- Чтение профилей `Office`, `Game I`, `Game II` и `Game III`.
- Просмотр назначений всех восьми клавиш в каждом профиле.
- Запись текста и распространённых клавиатурных действий во встроенную память.
- Копирование профиля, очистка отдельных клавиш и восстановление резервных копий.
- Автоматическая резервная копия EEPROM перед каждым изменением.
- Проверка записи повторным чтением изменённых байтов.
- Полностью локальный интерфейс на `127.0.0.1` без облачных сервисов.
- Интерфейс на английском, русском и упрощённом китайском языках.

Поддерживаются действия `{TAB}`, `{ENTER}`, `{ESC}`, `{BACKSPACE}`, `{DELETE}`, `{CMD+TAB}`, `{ALT+TAB}` и распространённые сочетания с `CTRL`. Текст пока ограничен символами американской английской HID-раскладки.

### Установка и запуск

Нужны macOS, Python 3 и Apple Command Line Tools с `clang` и `make`.

```bash
xcode-select --install
git clone https://github.com/zergzorg/vorotex-k08-mac.git
cd vorotex-k08-mac
make run
```

Откройте [http://127.0.0.1:8788](http://127.0.0.1:8788). Если macOS запрещает HID-доступ, разрешите его для терминала в разделе **Системные настройки → Конфиденциальность и безопасность → Мониторинг ввода**, затем перезапустите программу.

Пометка активного профиля показывает, какой профиль сейчас использует клавиатура. Редактирование другого профиля не переключает устройство на него.

### Конфиденциальность и безопасность

Память макросов K08 **не зашифрована**. Человек, получивший доступ к клавиатуре, может прочитать сохранённые логины, пароли, команды и токены. Локальные резервные копии содержат те же данные в открытом виде.

- Копии сохраняются только в `data/backups/`.
- Папка `data/` полностью исключена из Git.
- Значения макросов по умолчанию скрыты в интерфейсе.
- В репозитории нет дампов устройства, личных назначений, учётных данных, файлов производителя или закрытого Windows-драйвера.

Сохраняйте резервную копию, не отключайте клавиатуру во время записи и используйте программу только со своим устройством. Проект не связан с VOROTEX и не поддерживается производителем.

## 中文

这是一个非官方的开源 macOS 工具，用于编辑 VOROTEX K08 八键宏键盘的板载内存。程序完全在本机运行，可以读取四个硬件配置文件，并将宏直接写入键盘。因此，写入后的按键设置可以在其他电脑上使用，无需运行本程序。

本项目已在 USB VID/PID 为 `30fa:1340` 的 K08 上测试。其他硬件版本可能采用不同协议，目前尚未支持。

### 功能

- 读取 `Office`、`Game I`、`Game II` 和 `Game III` 四个配置文件。
- 查看每个配置文件中全部八个按键的设置。
- 将文本和常用键盘操作写入板载内存。
- 复制完整配置文件、清除单个按键以及恢复备份。
- 每次修改前自动创建 EEPROM 备份。
- 写入后重新读取相关字节并验证结果。
- 界面仅通过本机 `127.0.0.1` 提供，不使用云服务。
- 提供英语、俄语和简体中文界面。

支持 `{TAB}`、`{ENTER}`、`{ESC}`、`{BACKSPACE}`、`{DELETE}`、`{CMD+TAB}`、`{ALT+TAB}` 以及常见的 `CTRL` 组合键。文本输入目前仅支持美式英语 HID 键盘布局中的字符。

### 安装与运行

需要 macOS、Python 3，以及包含 `clang` 和 `make` 的 Apple Command Line Tools。

```bash
xcode-select --install
git clone https://github.com/zergzorg/vorotex-k08-mac.git
cd vorotex-k08-mac
make run
```

在浏览器中打开 [http://127.0.0.1:8788](http://127.0.0.1:8788)。如果 macOS 拒绝 HID 访问，请在 **系统设置 → 隐私与安全性 → 输入监控** 中允许终端应用访问，然后重新启动程序。

标记为活动的配置文件就是键盘当前正在使用的配置。编辑其他配置文件不会自动切换键盘的活动配置。

### 隐私与安全

K08 的宏内存**未加密**。任何能够接触键盘的人都可能读取其中保存的登录名、密码、命令和令牌。本地备份也以原始形式包含相同的敏感信息。

- 备份仅保存在 `data/backups/`。
- 整个 `data/` 目录都被 Git 忽略。
- 界面默认隐藏宏内容。
- 本仓库不包含设备内存转储、个人按键设置、凭据、厂商程序或专有 Windows 驱动。

请保留备份，写入过程中不要断开键盘，并且仅在您拥有的设备上使用本软件。本项目与 VOROTEX 没有从属或官方认可关系。

## Development

```bash
make build
make test
python3 server.py --port 8788
```

The project has no third-party runtime dependencies:

- `native/k08hid.c` communicates with the keypad through macOS IOKit.
- `k08_decode.py` decodes the four binding tables and macro events.
- `k08_program.py` plans, backs up, writes, restores, and verifies EEPROM changes.
- `server.py` exposes a localhost-only JSON API and serves the files in `web/`.

Before publishing a fork, inspect `git diff --cached`. Never force-add `data/`, EEPROM dumps, or logs containing real macros. See [SECURITY.md](SECURITY.md) for reporting guidance.

## Contributing

Bug reports and pull requests are welcome. Include the USB VID/PID, macOS version, the failed operation, and sanitized logs. Never attach an EEPROM dump unless every stored macro has been removed or replaced with test data.

## License

[MIT](LICENSE)
