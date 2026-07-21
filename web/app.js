const $ = (id) => document.getElementById(id);

const TOKEN_EVENTS = {
  "ENTER": 2,
  "TAB": 2,
  "ESC": 2,
  "BACKSPACE": 2,
  "DELETE": 2,
  "ALT+TAB": 4,
  "WIN+TAB": 4,
  "CMD+TAB": 4,
  "CTRL+A": 4,
  "CTRL+C": 4,
  "CTRL+V": 4,
  "CTRL+X": 4,
};

const UNSHIFTED = new Set("abcdefghijklmnopqrstuvwxyz0123456789\n\t -=[]\\;'`,./");
const SHIFTED = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+{}|:\"~<>?");
const mutationButtons = ["writeKey", "clearKey", "confirmCopy", "createBackup", "restoreBackup"];
const PROFILE_NAMES = {
  1: "Office",
  2: "Game I",
  3: "Game II",
  4: "Game III",
};

const LOCALE_NAMES = {
  en: "en-US",
  ru: "ru-RU",
  zh: "zh-CN",
};

const I18N = {
  en: {
    pageTitle: "VOROTEX K08 — keyboard memory",
    languageLabel: "Interface language",
    brandSubtitle: "Keyboard memory",
    hideValues: "Hide values",
    deviceChecking: "Checking K08…",
    deviceMemory: "Device memory",
    profilesTitle: "Four profiles, eight keys",
    activeReading: "Reading active profile…",
    profileTabsLabel: "Memory profile",
    copyProfile: "Copy profile",
    backups: "Backups",
    deviceUnavailable: "K08 unavailable",
    reconnect: "Reconnect the keypad and try reading again.",
    retry: "Retry",
    workspaceLabel: "K08 profile editor",
    openedForViewing: "Open for viewing",
    reading: "Reading…",
    keypadLabel: "Keys in the selected profile",
    notWritten: "Not written",
    selectKey: "Select a key",
    phraseOrCommand: "Text or command",
    insertAction: "Insert action",
    layoutLabel: "Layout:",
    layoutWarning: "the other computer must use an English keyboard layout before playback.",
    passwordsLabel: "Passwords:",
    passwordsWarning: "K08 macros and backups are not encrypted.",
    writeSettings: "Write settings",
    address: "Address",
    sharedReferences: "Shared references",
    fullAssignmentCopy: "Complete assignment copy",
    close: "Close",
    fromProfile: "From profile",
    toCurrent: "To current",
    copyWarning: "All eight assignments in the target profile will be replaced. A backup is created automatically first.",
    cancel: "Cancel",
    copy: "Copy",
    memoryProtection: "Memory protection",
    createBackupNow: "Create backup now",
    restoreState: "Restore state",
    selectSavedState: "Select a saved state.",
    restoreMemory: "Restore memory",
    deviceWrite: "Write to device",
    confirmAction: "Confirm action",
    confirm: "Confirm",
    profileFallback: "Profile {profile}",
    empty: "Empty",
    invalidCharacter: "Character “{char}” cannot be written as a HID key. Use Latin characters and supported actions.",
    macroTooLong: "The macro contains {count} events; the maximum is 127.",
    requestFailed: "K08 could not complete the request",
    deviceNotFound: "K08 not found",
    activeProfile: "Active: {profile}",
    deviceConnected: "K08 connected",
    connectToRead: "Connect the K08 to read its onboard memory.",
    activeUnknown: "The active profile could not be determined.",
    activeContext: "{profile} is open and currently active on the keypad.",
    inactiveContext: "{view} is open; {active} is active on the keypad. Writing here will not change the active profile.",
    activeOnK08: "Active on K08",
    unsavedCount: "{count} unsaved",
    hiddenValue: "K{key}: value hidden",
    visibleValue: "K{key}: {value}",
    needsEdit: "Needs editing",
    eventsCount: "{count} HID events",
    assignedCount: "{count} of 8 assigned",
    eventMeter: "{count} / 127 events",
    writeTo: "Write to {profile}",
    clearKey: "Clear K{key}",
    newBlock: "New block",
    bindingUnread: "Data for this key has not been read.",
    bindingEmpty: "This key is not assigned in the selected profile.",
    sharedMacro: "The current macro is used in {count} profiles. The new value will be stored separately and will not change the others.",
    bindingDetails: "{count} HID events · {address}",
    addressUnknown: "address unknown",
    readDone: "Read from K08",
    noData: "No data",
    sizeKb: "{size} KB",
    noBackups: "No backups yet",
    createFirstBackup: "Create the first backup of the current K08 memory.",
    backupReadFailed: "Could not read backups",
    writeTitle: "Write K{key}",
    writeActiveText: "The assignment will be saved to the active {profile} profile.",
    writeInactiveText: "The assignment will be saved to {view}, but {active} is currently active on the keypad.",
    backupAutomatic: "A backup is created automatically",
    writeConfirm: "Write to K08",
    activeChange: "This change belongs to the active profile.",
    activeRemains: "{profile} remains active on the K08.",
    writeDone: "Written to {profile}",
    writeDoneDetails: "K{key}. {activeNote} Backup: {backup}",
    writeFailed: "Write not completed",
    clearTitle: "Clear K{key}",
    clearText: "The key will be cleared only in {profile}.",
    clearConfirm: "Clear key",
    keyCleared: "Key cleared",
    keyClearedDetails: "{profile}, K{key}. Backup: {backup}",
    clearFailed: "Clear failed",
    profileCopied: "Profile copied",
    profileCopiedDetails: "{source} → {target}. Backup: {backup}",
    copyFailed: "Copy failed",
    backupCreated: "Backup created",
    backupFailed: "Backup not created",
    restoreTitle: "Restore all memory",
    restoreText: "Assignments in all four profiles will be replaced with the selected backup.",
    draftsDeleted: "All local drafts will be deleted",
    restoreConfirm: "Restore memory",
    restoreDone: "Memory restored",
    restoreFailed: "Restore failed",
    permissionDenied: "macOS denied access to the K08. Allow your terminal under Input Monitoring and restart the app.",
  },
  ru: {
    pageTitle: "VOROTEX K08 — память клавиатуры",
    languageLabel: "Язык интерфейса",
    brandSubtitle: "Память клавиатуры",
    hideValues: "Скрыть значения",
    deviceChecking: "Проверка K08…",
    deviceMemory: "Память устройства",
    profilesTitle: "Четыре профиля, восемь клавиш",
    activeReading: "Чтение активного профиля…",
    profileTabsLabel: "Профиль памяти",
    copyProfile: "Копировать профиль",
    backups: "Резервные копии",
    deviceUnavailable: "K08 недоступна",
    reconnect: "Переподключи клавиатуру и повтори чтение.",
    retry: "Повторить",
    workspaceLabel: "Редактор профиля K08",
    openedForViewing: "Открыт для просмотра",
    reading: "Чтение…",
    keypadLabel: "Клавиши выбранного профиля",
    notWritten: "Не записано",
    selectKey: "Выбери клавишу",
    phraseOrCommand: "Фраза или команда",
    insertAction: "Вставить действие",
    layoutLabel: "Раскладка:",
    layoutWarning: "на другом ПК перед вводом должна быть включена английская раскладка.",
    passwordsLabel: "Пароли:",
    passwordsWarning: "макросы и резервные копии K08 не зашифрованы.",
    writeSettings: "Параметры записи",
    address: "Адрес",
    sharedReferences: "Общих ссылок",
    fullAssignmentCopy: "Полная копия назначений",
    close: "Закрыть",
    fromProfile: "Из профиля",
    toCurrent: "В текущий",
    copyWarning: "Все восемь назначений целевого профиля будут заменены. Перед операцией автоматически создается резервная копия.",
    cancel: "Отмена",
    copy: "Копировать",
    memoryProtection: "Защита памяти",
    createBackupNow: "Создать копию сейчас",
    restoreState: "Восстановить состояние",
    selectSavedState: "Выбери сохраненное состояние.",
    restoreMemory: "Восстановить память",
    deviceWrite: "Запись в устройство",
    confirmAction: "Подтвердить действие",
    confirm: "Подтвердить",
    profileFallback: "Профиль {profile}",
    empty: "Пусто",
    invalidCharacter: "Символ «{char}» нельзя записать как HID-клавишу. Используй латиницу и поддерживаемые действия.",
    macroTooLong: "Макрос содержит {count} событий, максимум — 127.",
    requestFailed: "K08 не выполнила запрос",
    deviceNotFound: "K08 не найдена",
    activeProfile: "Активен {profile}",
    deviceConnected: "K08 подключена",
    connectToRead: "Подключи K08, чтобы прочитать встроенную память.",
    activeUnknown: "Активный профиль не удалось определить.",
    activeContext: "{profile} открыт и сейчас активен на клавиатуре.",
    inactiveContext: "Открыт {view}; на клавиатуре активен {active}. Запись сюда не изменит активный профиль.",
    activeOnK08: "Активен на K08",
    unsavedCount: "Не записано: {count}",
    hiddenValue: "K{key}: значение скрыто",
    visibleValue: "K{key}: {value}",
    needsEdit: "Нужна правка",
    eventsCount: "HID-событий: {count}",
    assignedCount: "Назначено: {count} из 8",
    eventMeter: "{count} / 127 событий",
    writeTo: "Записать в {profile}",
    clearKey: "Очистить K{key}",
    newBlock: "Новый блок",
    bindingUnread: "Данные этой клавиши не прочитаны.",
    bindingEmpty: "Клавиша не назначена в этом профиле.",
    sharedMacro: "Текущий макрос используется в {count} профилях. Новая запись будет отдельной и не изменит остальные.",
    bindingDetails: "HID-событий: {count} · {address}",
    addressUnknown: "адрес не определен",
    readDone: "Прочитано из K08",
    noData: "Нет данных",
    sizeKb: "{size} КБ",
    noBackups: "Копий пока нет",
    createFirstBackup: "Создай первую резервную копию текущей памяти K08.",
    backupReadFailed: "Не удалось прочитать копии",
    writeTitle: "Записать K{key}",
    writeActiveText: "Назначение будет сохранено в активном профиле {profile}.",
    writeInactiveText: "Назначение будет сохранено в {view}, но на клавиатуре сейчас активен {active}.",
    backupAutomatic: "Резервная копия создается автоматически",
    writeConfirm: "Записать в K08",
    activeChange: "Изменение относится к активному профилю.",
    activeRemains: "На K08 остается активен {profile}.",
    writeDone: "Записано в {profile}",
    writeDoneDetails: "K{key}. {activeNote} Бэкап: {backup}",
    writeFailed: "Запись не завершена",
    clearTitle: "Очистить K{key}",
    clearText: "Клавиша станет пустой только в {profile}.",
    clearConfirm: "Очистить клавишу",
    keyCleared: "Клавиша очищена",
    keyClearedDetails: "{profile}, K{key}. Бэкап: {backup}",
    clearFailed: "Очистка не выполнена",
    profileCopied: "Профиль скопирован",
    profileCopiedDetails: "{source} → {target}. Бэкап: {backup}",
    copyFailed: "Копирование не выполнено",
    backupCreated: "Резервная копия создана",
    backupFailed: "Копия не создана",
    restoreTitle: "Восстановить всю память",
    restoreText: "Текущие назначения четырех профилей будут заменены состоянием из резервной копии.",
    draftsDeleted: "Все локальные черновики будут удалены",
    restoreConfirm: "Восстановить память",
    restoreDone: "Память восстановлена",
    restoreFailed: "Восстановление не выполнено",
    permissionDenied: "macOS не разрешила доступ к K08. Разреши терминалу мониторинг ввода и перезапусти приложение.",
  },
  zh: {
    pageTitle: "VOROTEX K08 — 键盘内存",
    languageLabel: "界面语言",
    brandSubtitle: "键盘内存",
    hideValues: "隐藏内容",
    deviceChecking: "正在检查 K08…",
    deviceMemory: "设备内存",
    profilesTitle: "四个配置文件，八个按键",
    activeReading: "正在读取活动配置…",
    profileTabsLabel: "内存配置文件",
    copyProfile: "复制配置",
    backups: "备份",
    deviceUnavailable: "K08 不可用",
    reconnect: "请重新连接键盘并再次读取。",
    retry: "重试",
    workspaceLabel: "K08 配置编辑器",
    openedForViewing: "当前查看",
    reading: "正在读取…",
    keypadLabel: "所选配置中的按键",
    notWritten: "尚未写入",
    selectKey: "请选择按键",
    phraseOrCommand: "文本或命令",
    insertAction: "插入操作",
    layoutLabel: "键盘布局：",
    layoutWarning: "在其他电脑上执行宏之前，请切换到英文键盘布局。",
    passwordsLabel: "密码：",
    passwordsWarning: "K08 宏和备份均未加密。",
    writeSettings: "写入设置",
    address: "地址",
    sharedReferences: "共享引用",
    fullAssignmentCopy: "复制全部按键设置",
    close: "关闭",
    fromProfile: "来源配置",
    toCurrent: "复制到当前配置",
    copyWarning: "目标配置中的八个按键设置将全部被替换。操作前会自动创建备份。",
    cancel: "取消",
    copy: "复制",
    memoryProtection: "内存保护",
    createBackupNow: "立即创建备份",
    restoreState: "恢复状态",
    selectSavedState: "请选择已保存的状态。",
    restoreMemory: "恢复内存",
    deviceWrite: "写入设备",
    confirmAction: "确认操作",
    confirm: "确认",
    profileFallback: "配置 {profile}",
    empty: "空",
    invalidCharacter: "字符“{char}”无法作为 HID 按键写入。请使用拉丁字符或受支持的操作。",
    macroTooLong: "宏包含 {count} 个事件，最多允许 127 个。",
    requestFailed: "K08 无法完成请求",
    deviceNotFound: "未找到 K08",
    activeProfile: "活动配置：{profile}",
    deviceConnected: "K08 已连接",
    connectToRead: "请连接 K08 以读取板载内存。",
    activeUnknown: "无法确定活动配置。",
    activeContext: "已打开 {profile}，该配置目前在键盘上处于活动状态。",
    inactiveContext: "已打开 {view}；键盘当前使用 {active}。写入此处不会改变活动配置。",
    activeOnK08: "K08 当前活动",
    unsavedCount: "{count} 项未写入",
    hiddenValue: "K{key}：内容已隐藏",
    visibleValue: "K{key}：{value}",
    needsEdit: "需要修改",
    eventsCount: "{count} 个 HID 事件",
    assignedCount: "已设置 {count}/8",
    eventMeter: "{count} / 127 个事件",
    writeTo: "写入 {profile}",
    clearKey: "清除 K{key}",
    newBlock: "新数据块",
    bindingUnread: "尚未读取此按键的数据。",
    bindingEmpty: "此按键在当前配置中没有设置。",
    sharedMacro: "当前宏被 {count} 个配置共同使用。新内容将单独保存，不会修改其他配置。",
    bindingDetails: "{count} 个 HID 事件 · {address}",
    addressUnknown: "地址未知",
    readDone: "已从 K08 读取",
    noData: "无数据",
    sizeKb: "{size} KB",
    noBackups: "暂无备份",
    createFirstBackup: "为当前 K08 内存创建第一个备份。",
    backupReadFailed: "无法读取备份",
    writeTitle: "写入 K{key}",
    writeActiveText: "按键设置将保存到当前活动配置 {profile}。",
    writeInactiveText: "按键设置将保存到 {view}，但键盘当前使用的是 {active}。",
    backupAutomatic: "将自动创建备份",
    writeConfirm: "写入 K08",
    activeChange: "此更改属于当前活动配置。",
    activeRemains: "K08 仍使用 {profile}。",
    writeDone: "已写入 {profile}",
    writeDoneDetails: "K{key}。{activeNote} 备份：{backup}",
    writeFailed: "写入未完成",
    clearTitle: "清除 K{key}",
    clearText: "只会清除 {profile} 中的此按键。",
    clearConfirm: "清除按键",
    keyCleared: "按键已清除",
    keyClearedDetails: "{profile}，K{key}。备份：{backup}",
    clearFailed: "清除失败",
    profileCopied: "配置已复制",
    profileCopiedDetails: "{source} → {target}。备份：{backup}",
    copyFailed: "复制失败",
    backupCreated: "备份已创建",
    backupFailed: "未能创建备份",
    restoreTitle: "恢复全部内存",
    restoreText: "四个配置中的当前按键设置将被所选备份替换。",
    draftsDeleted: "所有本地草稿都将被删除",
    restoreConfirm: "恢复内存",
    restoreDone: "内存已恢复",
    restoreFailed: "恢复失败",
    permissionDenied: "macOS 拒绝访问 K08。请允许终端进行输入监控，然后重新启动程序。",
  },
};

function detectLanguage() {
  const saved = localStorage.getItem("k08-language");
  if (saved in I18N) return saved;
  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith("zh")) return "zh";
  if (browserLanguage.startsWith("ru")) return "ru";
  return "en";
}

const state = {
  language: detectLanguage(),
  connected: false,
  activeLayer: null,
  viewLayer: 1,
  layerChosen: false,
  selectedKey: 1,
  layers: [],
  drafts: new Map(),
  backups: [],
  pending: 0,
  toastTimer: null,
  readStatus: "reading",
};

function t(key, values = {}) {
  const template = I18N[state.language]?.[key] || I18N.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? `{${name}}`));
}

function applyStaticTranslations() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : state.language;
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.getAttribute("data-i18n-aria-label")));
  });
  $("languageSelect").value = state.language;
}

function draftId(layer = state.viewLayer, key = state.selectedKey) {
  return `${layer}:${key}`;
}

function currentLayer() {
  return state.layers.find((layer) => layer.layer === state.viewLayer) || null;
}

function profileName(layer) {
  return PROFILE_NAMES[layer] || t("profileFallback", { profile: layer });
}

function currentItem() {
  return currentLayer()?.keys.find((item) => item.key === state.selectedKey) || null;
}

function storedText() {
  return currentItem()?.text || "";
}

function editorText() {
  const id = draftId();
  return state.drafts.has(id) ? state.drafts.get(id) : storedText();
}

function layerDraftCount(layer) {
  let count = 0;
  for (const key of state.drafts.keys()) {
    if (key.startsWith(`${layer}:`)) count += 1;
  }
  return count;
}

function isPrivate() {
  return $("privacyToggle").checked;
}

function maskPreview(text) {
  if (!text) return t("empty");
  if (!isPrivate()) return text;
  return "••••••••••••";
}

function calculateEvents(text) {
  let events = 0;
  let position = 0;
  while (position < text.length) {
    if (text[position] === "{") {
      const end = text.indexOf("}", position + 1);
      if (end !== -1) {
        const token = text.slice(position + 1, end).trim().toUpperCase();
        if (TOKEN_EVENTS[token] !== undefined) {
          events += TOKEN_EVENTS[token];
          position = end + 1;
          continue;
        }
      }
    }

    const char = text[position];
    if (UNSHIFTED.has(char)) {
      events += 2;
    } else if (SHIFTED.has(char)) {
      events += 4;
    } else {
      return { events, error: t("invalidCharacter", { char }) };
    }
    position += 1;
  }

  if (events > 127) {
    return { events, error: t("macroTooLong", { count: events }) };
  }
  return { events, error: "" };
}

function setPending(delta) {
  state.pending = Math.max(0, state.pending + delta);
  document.body.classList.toggle("busy", state.pending > 0);
}

function setMutationBusy(value) {
  mutationButtons.forEach((id) => {
    const button = $(id);
    if (button) button.disabled = value;
  });
}

async function api(path, payload = null) {
  setPending(1);
  try {
    const response = await fetch(path, {
      method: payload === null ? "GET" : "POST",
      headers: payload === null ? undefined : { "Content-Type": "application/json" },
      body: payload === null ? undefined : JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t("requestFailed"));
    return data;
  } finally {
    setPending(-1);
  }
}

function showToast(title, text = "") {
  window.clearTimeout(state.toastTimer);
  $("toastTitle").textContent = title;
  $("toastText").textContent = text;
  $("toast").hidden = false;
  state.toastTimer = window.setTimeout(() => {
    $("toast").hidden = true;
  }, 4500);
}

function setDeviceError(message = "") {
  $("deviceError").hidden = !message;
  $("deviceErrorText").textContent = message;
}

function localizedError(message) {
  if (!message) return t("requestFailed");
  if (message.includes("K08 keyboard HID interface not found") || message.includes("K08 не найдена")) {
    return t("reconnect");
  }
  if (message.includes("not permitted") || message.includes("not privileged") || message.includes("macOS не разрешила доступ")) {
    return t("permissionDenied");
  }
  return message;
}

function renderDevice() {
  const status = $("deviceStatus");
  const dot = $("statusDot");
  dot.classList.toggle("connected", state.connected);
  dot.classList.toggle("disconnected", !state.connected);
  if (!state.connected) {
    status.textContent = t("deviceNotFound");
    return;
  }
  status.textContent = state.activeLayer
    ? t("activeProfile", { profile: profileName(state.activeLayer) })
    : t("deviceConnected");
}

function renderLayerContext() {
  if (!state.connected) {
    $("layerContext").textContent = t("connectToRead");
    return;
  }
  if (!state.activeLayer) {
    $("layerContext").textContent = t("activeUnknown");
    return;
  }
  if (state.activeLayer === state.viewLayer) {
    $("layerContext").textContent = t("activeContext", { profile: profileName(state.activeLayer) });
  } else {
    $("layerContext").textContent = t("inactiveContext", {
      view: profileName(state.viewLayer),
      active: profileName(state.activeLayer),
    });
  }
}

function renderTabs() {
  document.querySelectorAll("#layerTabs [data-layer]").forEach((button) => {
    const layer = Number(button.dataset.layer);
    const selected = layer === state.viewLayer;
    const drafts = layerDraftCount(layer);
    const statuses = [];
    if (layer === state.activeLayer) statuses.push(t("activeOnK08"));
    if (drafts) statuses.push(t("unsavedCount", { count: drafts }));
    button.setAttribute("aria-selected", String(selected));
    button.classList.toggle("has-draft", drafts > 0);
    button.querySelector("small").textContent = statuses.join(" · ");
  });
  $("viewLayerTitle").textContent = profileName(state.viewLayer);
  renderLayerContext();
}

function makeKeycap(item) {
  const key = item?.key || 1;
  const text = state.drafts.has(draftId(state.viewLayer, key))
    ? state.drafts.get(draftId(state.viewLayer, key))
    : item?.text || "";
  const validation = calculateEvents(text);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "keycap";
  button.dataset.key = String(key);
  button.setAttribute("aria-pressed", String(key === state.selectedKey));
  button.setAttribute(
    "aria-label",
    isPrivate()
      ? t("hiddenValue", { key })
      : t("visibleValue", { key, value: text || t("empty") }),
  );
  button.style.gridColumn = key <= 4 ? "1" : "2";
  button.style.gridRow = String(key <= 4 ? key : key - 4);
  button.classList.toggle("has-draft", state.drafts.has(draftId(state.viewLayer, key)));
  button.classList.toggle("keycap-empty", !text);

  const id = document.createElement("span");
  id.className = "keycap-id";
  id.textContent = `K${key}`;
  const preview = document.createElement("span");
  preview.className = "macro-preview";
  preview.textContent = maskPreview(text);
  const events = document.createElement("span");
  events.className = "keycap-events";
  events.textContent = validation.error ? t("needsEdit") : t("eventsCount", { count: validation.events });
  button.append(id, preview, events);
  button.addEventListener("click", () => selectKey(key));
  return button;
}

function renderKeypad(animate = false) {
  const keypad = $("keypad");
  keypad.replaceChildren();
  const layer = currentLayer();
  const items = layer?.keys || Array.from({ length: 8 }, (_, index) => ({ key: index + 1 }));
  items.forEach((item) => keypad.append(makeKeycap(item)));
  const filled = items.filter((item) => {
    const id = draftId(state.viewLayer, item.key);
    return (state.drafts.has(id) ? state.drafts.get(id) : item.text || "").length > 0;
  }).length;
  $("layerFingerprint").textContent = t("assignedCount", { count: filled });
  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    keypad.animate(
      [{ opacity: .35, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 170, easing: "ease-out" },
    );
  }
}

function updateEditorStatus() {
  const text = $("macroText").value;
  const validation = calculateEvents(text);
  const dirty = state.drafts.has(draftId());
  $("eventMeter").textContent = t("eventMeter", { count: validation.events });
  $("macroError").hidden = !validation.error;
  $("macroError").textContent = validation.error;
  $("changeBadge").hidden = !dirty;
  $("writeKey").disabled = !state.connected || !text || Boolean(validation.error) || state.pending > 0;
  $("clearKey").disabled = !state.connected || (!storedText() && !dirty) || state.pending > 0;
  renderTabs();
}

function renderEditor() {
  const item = currentItem();
  $("editorLayer").textContent = profileName(state.viewLayer);
  $("editorTitle").textContent = `K${state.selectedKey}`;
  $("macroText").value = editorText();
  $("writeKey").textContent = t("writeTo", { profile: profileName(state.viewLayer) });
  $("clearKey").textContent = t("clearKey", { key: state.selectedKey });
  $("macroAddress").textContent = item?.macro_address || t("newBlock");
  $("sharedCount").textContent = item?.shared_count ? String(item.shared_count) : "0";
  if (!item) {
    $("bindingMeta").textContent = t("bindingUnread");
  } else if (!item.text) {
    $("bindingMeta").textContent = t("bindingEmpty");
  } else if (item.shared_count > 1) {
    $("bindingMeta").textContent = t("sharedMacro", { count: item.shared_count });
  } else {
    $("bindingMeta").textContent = t("bindingDetails", {
      count: item.event_count,
      address: item.macro_address || t("addressUnknown"),
    });
  }
  updateEditorStatus();
}

function selectKey(key) {
  state.selectedKey = key;
  renderKeypad();
  renderEditor();
}

function selectLayer(layer) {
  state.layerChosen = true;
  state.viewLayer = layer;
  renderTabs();
  renderKeypad(true);
  renderEditor();
}

async function loadDevice() {
  try {
    const data = await api("/api/status");
    state.connected = Boolean(data.connected);
    state.activeLayer = data.active_layer || null;
    if (state.activeLayer && !state.layerChosen && !state.drafts.size) {
      state.viewLayer = state.activeLayer;
    }
    setDeviceError(state.connected ? "" : t("reconnect"));
  } catch (error) {
    state.connected = false;
    state.activeLayer = null;
    setDeviceError(localizedError(error.message));
  }
  renderDevice();
  renderTabs();
}

async function loadLayers() {
  state.readStatus = "reading";
  renderReadState();
  try {
    const data = await api("/api/layers");
    state.layers = data.layers || [];
    state.readStatus = "ready";
    setDeviceError("");
  } catch (error) {
    state.layers = [];
    state.readStatus = "empty";
    setDeviceError(localizedError(error.message));
  }
  renderReadState();
  renderTabs();
  renderKeypad();
  renderEditor();
}

function renderReadState() {
  const labels = {
    reading: "reading",
    ready: "readDone",
    empty: "noData",
    unavailable: "deviceUnavailable",
  };
  $("readState").textContent = t(labels[state.readStatus] || "noData");
  $("readState").classList.toggle("ready", state.readStatus === "ready");
}

function formatBackup(item) {
  const date = new Date(item.created_at);
  const stamp = Number.isNaN(date.getTime())
    ? item.created_at
    : new Intl.DateTimeFormat(LOCALE_NAMES[state.language], { dateStyle: "medium", timeStyle: "short" }).format(date);
  return `${stamp} · ${t("sizeKb", { size: Math.ceil(item.size / 1024) })}`;
}

function renderBackups() {
  const select = $("backupSelect");
  select.replaceChildren();
  if (!state.backups.length) {
    const option = document.createElement("option");
    option.textContent = t("noBackups");
    option.value = "";
    select.append(option);
    select.disabled = true;
    $("restoreBackup").disabled = true;
    $("backupMeta").textContent = t("createFirstBackup");
    return;
  }
  state.backups.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = formatBackup(item);
    select.append(option);
  });
  select.disabled = false;
  $("restoreBackup").disabled = false;
  updateBackupMeta();
}

function updateBackupMeta() {
  const item = state.backups.find((backup) => backup.name === $("backupSelect").value);
  $("backupMeta").textContent = item ? item.name : t("selectSavedState");
}

async function loadBackups() {
  try {
    const data = await api("/api/backups");
    state.backups = data.backups || [];
  } catch (error) {
    state.backups = [];
    showToast(t("backupReadFailed"), localizedError(error.message));
  }
  renderBackups();
}

function askConfirmation({ title, text, summary, confirmLabel = t("confirm"), danger = false }) {
  return new Promise((resolve) => {
    const dialog = $("confirmDialog");
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;
    $("confirmSummary").replaceChildren(...summary.map((line) => {
      const item = document.createElement("span");
      item.textContent = line;
      return item;
    }));
    const accept = $("acceptConfirm");
    accept.textContent = confirmLabel;
    accept.className = `button ${danger ? "danger" : "primary"}`;

    const finish = (result) => {
      accept.onclick = null;
      $("cancelConfirm").onclick = null;
      if (dialog.open) dialog.close();
      resolve(result);
    };
    accept.onclick = () => finish(true);
    $("cancelConfirm").onclick = () => finish(false);
    dialog.oncancel = (event) => {
      event.preventDefault();
      finish(false);
    };
    dialog.showModal();
  });
}

async function writeCurrentKey() {
  const text = $("macroText").value;
  const validation = calculateEvents(text);
  if (!text || validation.error) {
    updateEditorStatus();
    return;
  }
  const confirmed = await askConfirmation({
    title: t("writeTitle", { key: state.selectedKey }),
    text: state.viewLayer === state.activeLayer
      ? t("writeActiveText", { profile: profileName(state.viewLayer) })
      : t("writeInactiveText", {
        view: profileName(state.viewLayer),
        active: profileName(state.activeLayer),
      }),
    summary: [
      `${profileName(state.viewLayer)} · K${state.selectedKey}`,
      t("eventsCount", { count: validation.events }),
      t("backupAutomatic"),
    ],
    confirmLabel: t("writeConfirm"),
  });
  if (!confirmed) return;

  setMutationBusy(true);
  try {
    const result = await api("/api/write", {
      layer: state.viewLayer,
      key: state.selectedKey,
      text,
      commit: true,
    });
    state.drafts.delete(draftId());
    await Promise.all([loadLayers(), loadDevice(), loadBackups()]);
    const activeNote = result.layer === state.activeLayer
      ? t("activeChange")
      : t("activeRemains", { profile: profileName(state.activeLayer) });
    showToast(
      t("writeDone", { profile: profileName(result.layer) }),
      t("writeDoneDetails", { key: result.key, activeNote, backup: result.backup }),
    );
  } catch (error) {
    showToast(t("writeFailed"), localizedError(error.message));
    await loadLayers();
  } finally {
    setMutationBusy(false);
    updateEditorStatus();
  }
}

async function clearCurrentKey() {
  const confirmed = await askConfirmation({
    title: t("clearTitle", { key: state.selectedKey }),
    text: t("clearText", { profile: profileName(state.viewLayer) }),
    summary: [
      `${profileName(state.viewLayer)} · K${state.selectedKey}`,
      t("backupAutomatic"),
    ],
    confirmLabel: t("clearConfirm"),
    danger: true,
  });
  if (!confirmed) return;

  setMutationBusy(true);
  try {
    const result = await api("/api/clear", {
      layer: state.viewLayer,
      key: state.selectedKey,
      commit: true,
    });
    state.drafts.delete(draftId());
    await Promise.all([loadLayers(), loadBackups()]);
    showToast(
      t("keyCleared"),
      t("keyClearedDetails", {
        profile: profileName(result.layer),
        key: result.key,
        backup: result.backup,
      }),
    );
  } catch (error) {
    showToast(t("clearFailed"), localizedError(error.message));
    await loadLayers();
  } finally {
    setMutationBusy(false);
    updateEditorStatus();
  }
}

function openCopyDialog() {
  const target = state.viewLayer;
  $("copyTarget").textContent = profileName(target);
  Array.from($("copySource").options).forEach((option) => {
    option.disabled = Number(option.value) === target;
  });
  $("copySource").value = String([1, 2, 3, 4].find((layer) => layer !== target));
  $("copyDialog").showModal();
}

async function copyLayer() {
  const source = Number($("copySource").value);
  const target = state.viewLayer;
  setMutationBusy(true);
  try {
    const result = await api("/api/copy-layer", { source, target });
    for (const key of Array.from(state.drafts.keys())) {
      if (key.startsWith(`${target}:`)) state.drafts.delete(key);
    }
    $("copyDialog").close();
    await Promise.all([loadLayers(), loadBackups()]);
    showToast(
      t("profileCopied"),
      t("profileCopiedDetails", {
        source: profileName(result.source),
        target: profileName(result.target),
        backup: result.backup,
      }),
    );
  } catch (error) {
    showToast(t("copyFailed"), localizedError(error.message));
  } finally {
    setMutationBusy(false);
  }
}

async function createBackup() {
  setMutationBusy(true);
  try {
    const result = await api("/api/backup", {});
    await loadBackups();
    $("backupSelect").value = result.backup;
    updateBackupMeta();
    showToast(t("backupCreated"), result.backup);
  } catch (error) {
    showToast(t("backupFailed"), localizedError(error.message));
  } finally {
    setMutationBusy(false);
  }
}

async function restoreBackup() {
  const backup = $("backupSelect").value;
  if (!backup) return;
  $("backupDialog").close();
  const confirmed = await askConfirmation({
    title: t("restoreTitle"),
    text: t("restoreText"),
    summary: [backup, t("draftsDeleted")],
    confirmLabel: t("restoreConfirm"),
    danger: true,
  });
  if (!confirmed) return;

  setMutationBusy(true);
  try {
    await api("/api/restore", { backup });
    state.drafts.clear();
    await Promise.all([loadLayers(), loadDevice()]);
    showToast(t("restoreDone"), backup);
  } catch (error) {
    showToast(t("restoreFailed"), localizedError(error.message));
    await loadLayers();
  } finally {
    setMutationBusy(false);
  }
}

async function refreshAll() {
  await loadDevice();
  if (state.connected) await loadLayers();
}

function changeLanguage(language) {
  if (!(language in I18N)) return;
  state.language = language;
  localStorage.setItem("k08-language", language);
  applyStaticTranslations();
  renderDevice();
  renderTabs();
  renderKeypad();
  renderEditor();
  renderReadState();
  renderBackups();
  if (!state.connected) setDeviceError(t("reconnect"));
}

function bindEvents() {
  document.querySelectorAll("#layerTabs [data-layer]").forEach((button) => {
    button.addEventListener("click", () => selectLayer(Number(button.dataset.layer)));
  });
  $("macroText").addEventListener("input", () => {
    const value = $("macroText").value;
    const id = draftId();
    if (value === storedText()) state.drafts.delete(id);
    else state.drafts.set(id, value);
    renderKeypad();
    updateEditorStatus();
  });
  document.querySelectorAll("#tokenRow [data-token]").forEach((button) => {
    button.addEventListener("click", () => {
      const textarea = $("macroText");
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.setRangeText(button.dataset.token, start, end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    });
  });
  $("privacyToggle").addEventListener("change", () => {
    document.body.classList.toggle("privacy-on", isPrivate());
    localStorage.setItem("k08-private", isPrivate() ? "1" : "0");
    renderKeypad();
  });
  $("languageSelect").addEventListener("change", (event) => changeLanguage(event.target.value));
  $("refreshDevice").addEventListener("click", refreshAll);
  $("retryDevice").addEventListener("click", refreshAll);
  $("writeKey").addEventListener("click", writeCurrentKey);
  $("clearKey").addEventListener("click", clearCurrentKey);
  $("copyLayer").addEventListener("click", openCopyDialog);
  $("confirmCopy").addEventListener("click", copyLayer);
  $("openBackups").addEventListener("click", async () => {
    await loadBackups();
    $("backupDialog").showModal();
  });
  $("closeBackups").addEventListener("click", () => $("backupDialog").close());
  $("createBackup").addEventListener("click", createBackup);
  $("restoreBackup").addEventListener("click", restoreBackup);
  $("backupSelect").addEventListener("change", updateBackupMeta);
  window.addEventListener("beforeunload", (event) => {
    if (!state.drafts.size) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function init() {
  applyStaticTranslations();
  $("privacyToggle").checked = localStorage.getItem("k08-private") !== "0";
  document.body.classList.toggle("privacy-on", isPrivate());
  bindEvents();
  renderTabs();
  renderKeypad();
  renderEditor();
  await loadDevice();
  if (state.connected) await loadLayers();
  else {
    state.readStatus = "unavailable";
    renderReadState();
    renderEditor();
  }
}

init();
