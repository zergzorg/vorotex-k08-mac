import { I18N, LOCALE_NAMES } from "/i18n.js";

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

const TOKEN_LABELS = {
  "ENTER": "↵ Enter",
  "TAB": "⇥ Tab",
  "ESC": "Esc",
  "BACKSPACE": "⌫",
  "DELETE": "Delete",
  "CMD+TAB": "⌘ Tab",
  "WIN+TAB": "Win Tab",
  "ALT+TAB": "Alt Tab",
  "CTRL+A": "Ctrl A",
  "CTRL+C": "Ctrl C",
  "CTRL+V": "Ctrl V",
  "CTRL+X": "Ctrl X",
};

const KEY_TOKENS = ["ENTER", "TAB", "ESC", "BACKSPACE", "DELETE"];
const SHORTCUT_TOKENS = ["CMD+TAB", "ALT+TAB", "CTRL+A", "CTRL+C", "CTRL+V", "CTRL+X"];

const UNSHIFTED = new Set("abcdefghijklmnopqrstuvwxyz0123456789\n\t -=[]\\;'`,./");
const SHIFTED = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+{}|:\"~<>?");
const MAX_EVENTS = 127;
const KEYS = [1, 2, 3, 4, 5, 6, 7, 8];
const LAYERS = [1, 2, 3, 4];
const PROFILE_NAMES = { 1: "Office", 2: "Game I", 3: "Game II", 4: "Game III" };
const mutationButtons = ["writeKey", "clearKey", "revertKey", "confirmCopy", "createBackup", "restoreBackup"];

function detectLanguage() {
  const saved = localStorage.getItem("k08-language");
  if (saved in I18N) {
    return saved;
  }
  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith("zh")) {
    return "zh";
  }
  if (browserLanguage.startsWith("ru")) {
    return "ru";
  }
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
  selectedBackup: "",
  pending: 0,
  busy: false,
  checking: false,
  revealed: false,
  deviceError: "",
  toastTimer: null,
  readStatus: "reading",
  keycaps: [],
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
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });
  $("languageSelect").value = state.language;
}

function draftId(layer = state.viewLayer, key = state.selectedKey) {
  return `${layer}:${key}`;
}

function profileName(layer) {
  return PROFILE_NAMES[layer] || t("profileFallback", { profile: layer });
}

function findLayer(layer) {
  return state.layers.find((item) => item.layer === layer) || null;
}

function findItem(layer, key) {
  return findLayer(layer)?.keys.find((item) => item.key === key) || null;
}

function currentItem() {
  return findItem(state.viewLayer, state.selectedKey);
}

function storedText(layer = state.viewLayer, key = state.selectedKey) {
  return findItem(layer, key)?.text || "";
}

function keyText(layer, key) {
  const id = draftId(layer, key);
  return state.drafts.has(id) ? state.drafts.get(id) : storedText(layer, key);
}

function layerDraftCount(layer) {
  return Array.from(state.drafts.keys()).filter((id) => id.startsWith(`${layer}:`)).length;
}

function assignedCount(layer) {
  return KEYS.filter((key) => keyText(layer, key)).length;
}

function isPrivate() {
  return $("privacyToggle").checked;
}

function anyDialogOpen() {
  return Boolean(document.querySelector("dialog[open]"));
}

function tokenize(text) {
  const parts = [];
  let position = 0;
  while (position < text.length) {
    if (text[position] === "{") {
      const end = text.indexOf("}", position + 1);
      if (end !== -1) {
        const token = text.slice(position + 1, end).trim().toUpperCase();
        if (TOKEN_EVENTS[token] !== undefined) {
          parts.push({ token, events: TOKEN_EVENTS[token] });
          position = end + 1;
          continue;
        }
      }
    }
    const char = text[position];
    const events = UNSHIFTED.has(char) ? 2 : SHIFTED.has(char) ? 4 : 0;
    parts.push({ char, events });
    position += 1;
  }
  return parts;
}

function calculateEvents(text) {
  let events = 0;
  for (const part of tokenize(text)) {
    if (!part.events) {
      return { events, error: t("invalidCharacter", { char: part.char }) };
    }
    events += part.events;
  }
  if (events > MAX_EVENTS) {
    return { events, error: t("macroTooLong", { count: events }) };
  }
  return { events, error: "" };
}

function previewNodes(text) {
  if (!text) {
    return [t("empty")];
  }
  if (isPrivate()) {
    return ["••••••••••"];
  }
  const nodes = [];
  let buffer = "";
  for (const part of tokenize(text)) {
    if (!part.token) {
      buffer += part.char === "\n" ? "↵" : part.char === "\t" ? "⇥" : part.char;
      continue;
    }
    if (buffer) {
      nodes.push(buffer);
      buffer = "";
    }
    const chip = document.createElement("span");
    chip.className = "token-chip";
    chip.textContent = TOKEN_LABELS[part.token] || part.token;
    nodes.push(chip);
  }
  if (buffer) {
    nodes.push(buffer);
  }
  return nodes;
}

function setPending(delta) {
  state.pending = Math.max(0, state.pending + delta);
  document.body.classList.toggle("busy", state.pending > 0);
}

function setMutationBusy(value) {
  state.busy = value;
  mutationButtons.forEach((id) => {
    $(id).disabled = value;
  });
  if (!value) {
    renderEditorStatus();
    renderBackups();
  }
}

async function api(path, payload = null, { quiet = false } = {}) {
  if (!quiet) {
    setPending(1);
  }
  try {
    const response = await fetch(path, {
      method: payload === null ? "GET" : "POST",
      headers: payload === null ? undefined : { "Content-Type": "application/json" },
      body: payload === null ? undefined : JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || t("requestFailed"));
    }
    return data;
  } finally {
    if (!quiet) {
      setPending(-1);
    }
  }
}

function showToast(title, text = "", kind = "success") {
  window.clearTimeout(state.toastTimer);
  const toast = $("toast");
  $("toastTitle").textContent = title;
  $("toastText").textContent = text;
  toast.dataset.kind = kind;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, kind === "error" ? 9000 : 4500);
}

function localizedError(message) {
  if (!message) {
    return t("requestFailed");
  }
  if (message.includes("K08 keyboard HID interface not found") || message.includes("K08 не найдена")) {
    return t("reconnect");
  }
  if (message.includes("not permitted") || message.includes("not privileged") || message.includes("macOS не разрешила доступ")) {
    return t("permissionDenied");
  }
  return message;
}

function setDeviceError(message = "") {
  state.deviceError = message;
  $("deviceError").hidden = !message;
  $("deviceErrorText").textContent = message;
}

function renderDevice() {
  const dot = $("statusDot");
  dot.classList.toggle("connected", state.connected);
  dot.classList.toggle("disconnected", !state.connected);
  if (!state.connected) {
    $("deviceStatus").textContent = t("deviceNotFound");
  } else {
    $("deviceStatus").textContent = state.activeLayer
      ? t("activeProfile", { profile: profileName(state.activeLayer) })
      : t("deviceConnected");
  }
  document.body.classList.toggle("offline", !state.connected);
}

function renderContext() {
  let text = t("connectToRead");
  let kind = "muted";
  if (state.connected && !state.activeLayer) {
    text = t("activeUnknown");
  } else if (state.connected && state.activeLayer === state.viewLayer) {
    text = t("activeContext", { profile: profileName(state.activeLayer) });
    kind = "ok";
  } else if (state.connected) {
    text = t("inactiveContext", {
      view: profileName(state.viewLayer),
      active: profileName(state.activeLayer),
    });
    kind = "info";
  }
  $("layerContextText").textContent = text;
  $("layerContext").dataset.kind = kind;
}

function renderProfiles() {
  document.querySelectorAll("#layerTabs [data-layer]").forEach((button) => {
    const layer = Number(button.dataset.layer);
    const selected = layer === state.viewLayer;
    const drafts = layerDraftCount(layer);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.querySelector(".profile-meta").textContent = state.layers.length
      ? t("assignedShort", { count: assignedCount(layer) })
      : "—";
    button.querySelector(".active-badge").hidden = layer !== state.activeLayer;
    const draftBadge = button.querySelector(".draft-badge");
    draftBadge.hidden = !drafts;
    draftBadge.textContent = String(drafts);
    draftBadge.title = t("unsavedCount", { count: drafts });
  });
  $("viewLayerTitle").textContent = profileName(state.viewLayer);
  $("editorLayer").textContent = profileName(state.viewLayer);
  renderContext();
}

function buildKeypad() {
  state.keycaps = KEYS.map((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "keycap";
    button.dataset.key = String(key);
    button.style.gridColumn = String((key - 1) % 4 + 1);
    button.style.gridRow = key <= 4 ? "1" : "2";
    const top = document.createElement("span");
    top.className = "keycap-top";
    const id = document.createElement("span");
    id.className = "keycap-id";
    id.textContent = `K${key}`;
    const events = document.createElement("span");
    events.className = "keycap-events";
    top.append(id, events);
    const preview = document.createElement("span");
    preview.className = "macro-preview";
    button.append(top, preview);
    button.addEventListener("click", () => selectKey(key));
    $("keypad").append(button);
    return button;
  });
}

function renderKeypad() {
  state.keycaps.forEach((button, index) => {
    const key = index + 1;
    const text = keyText(state.viewLayer, key);
    const validation = calculateEvents(text);
    const selected = key === state.selectedKey;
    button.setAttribute("aria-pressed", String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.classList.toggle("has-draft", state.drafts.has(draftId(state.viewLayer, key)));
    button.classList.toggle("has-error", Boolean(validation.error));
    button.classList.toggle("keycap-empty", !text);
    button.setAttribute(
      "aria-label",
      isPrivate() ? t("hiddenValue", { key }) : t("visibleValue", { key, value: text || t("empty") }),
    );
    button.querySelector(".macro-preview").replaceChildren(...previewNodes(text));
    let events = "";
    if (validation.error) {
      events = t("needsEdit");
    } else if (text) {
      events = t("eventsShort", { count: validation.events });
    }
    button.querySelector(".keycap-events").textContent = events;
  });
  $("keypad").classList.toggle("loading", state.readStatus === "reading");
  $("layerFingerprint").textContent = state.layers.length
    ? t("assignedCount", { count: assignedCount(state.viewLayer) })
    : "—";
}

function renderReadState() {
  const labels = {
    reading: "reading",
    ready: "readDone",
    empty: "noData",
    unavailable: "deviceUnavailable",
  };
  $("readState").textContent = t(labels[state.readStatus] || "noData");
  $("readState").classList.toggle("ok", state.readStatus === "ready");
}

function renderEditorStatus() {
  const text = $("macroText").value;
  const validation = calculateEvents(text);
  const dirty = state.drafts.has(draftId());
  const ratio = Math.min(validation.events / MAX_EVENTS, 1);
  $("eventMeter").textContent = t("eventMeter", { count: validation.events, max: MAX_EVENTS });
  $("meterFill").style.width = `${ratio * 100}%`;
  $("meterFill").dataset.level = validation.error ? "error" : ratio > .85 ? "warn" : "ok";
  $("macroError").hidden = !validation.error;
  $("macroError").textContent = validation.error;
  $("macroText").setAttribute("aria-invalid", String(Boolean(validation.error)));
  $("changeBadge").hidden = !dirty;
  $("revertKey").hidden = !dirty;
  $("revealText").hidden = !isPrivate();
  $("revealText").setAttribute("aria-pressed", String(state.revealed));
  $("revealText").querySelector("span").textContent = t(state.revealed ? "hide" : "show");
  $("macroText").classList.toggle("revealed", state.revealed);
  if (state.busy) {
    return;
  }
  $("writeKey").disabled = !state.connected || !text || Boolean(validation.error) || state.pending > 0;
  $("clearKey").disabled = !state.connected || !storedText() || state.pending > 0;
  $("revertKey").disabled = false;
}

function loadEditor() {
  const item = currentItem();
  state.revealed = false;
  $("editorTitle").textContent = `K${state.selectedKey}`;
  $("macroText").value = keyText(state.viewLayer, state.selectedKey);
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
  renderEditorStatus();
}

function render() {
  renderDevice();
  renderProfiles();
  renderReadState();
  renderKeypad();
  renderEditorStatus();
}

function selectKey(key, focus = false) {
  state.selectedKey = key;
  renderKeypad();
  loadEditor();
  if (focus) {
    state.keycaps[key - 1].focus();
  }
}

function selectLayer(layer, focus = false) {
  state.layerChosen = true;
  state.viewLayer = layer;
  renderProfiles();
  renderKeypad();
  loadEditor();
  if (focus) {
    document.querySelector(`#layerTabs [data-layer="${layer}"]`).focus();
  }
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $("keypad").animate(
      [{ opacity: .4, transform: "translateY(3px)" }, { opacity: 1, transform: "none" }],
      { duration: 180, easing: "ease-out" },
    );
  }
}

async function loadDevice(quiet = false) {
  try {
    const data = await api("/api/status", null, { quiet });
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
  if (!state.connected) {
    state.readStatus = "unavailable";
  }
  render();
}

async function loadLayers() {
  state.readStatus = "reading";
  renderReadState();
  renderKeypad();
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
  render();
  loadEditor();
}

async function refreshAll() {
  await loadDevice();
  if (state.connected) {
    await loadLayers();
  }
}

async function checkDevice() {
  if (state.checking || state.pending || document.hidden || anyDialogOpen()) {
    return;
  }
  state.checking = true;
  const wasConnected = state.connected;
  try {
    await loadDevice(true);
    if (state.connected && !wasConnected) {
      await loadLayers();
    }
  } finally {
    state.checking = false;
  }
}

function formatBackupDate(item) {
  const date = new Date(item.created_at);
  if (Number.isNaN(date.getTime())) {
    return item.created_at;
  }
  return new Intl.DateTimeFormat(LOCALE_NAMES[state.language], { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function renderBackups() {
  const list = $("backupList");
  if (!state.backups.length) {
    const empty = document.createElement("p");
    empty.className = "backup-empty";
    empty.textContent = t("createFirstBackup");
    list.replaceChildren(empty);
    $("restoreBackup").disabled = true;
    return;
  }
  if (!state.backups.some((item) => item.name === state.selectedBackup)) {
    state.selectedBackup = state.backups[0].name;
  }
  list.replaceChildren(...state.backups.map((item, index) => {
    const row = document.createElement("label");
    row.className = "backup-row";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "backup";
    input.value = item.name;
    input.checked = item.name === state.selectedBackup;
    input.addEventListener("change", () => {
      state.selectedBackup = item.name;
    });
    const text = document.createElement("span");
    text.className = "backup-text";
    const date = document.createElement("strong");
    date.textContent = formatBackupDate(item);
    const name = document.createElement("small");
    name.textContent = `${item.name} · ${t("sizeKb", { size: Math.ceil(item.size / 1024) })}`;
    text.append(date, name);
    row.append(input, text);
    if (index === 0) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = t("latest");
      row.append(badge);
    }
    return row;
  }));
  $("restoreBackup").disabled = state.busy;
}

async function loadBackups() {
  try {
    const data = await api("/api/backups");
    state.backups = data.backups || [];
  } catch (error) {
    state.backups = [];
    showToast(t("backupReadFailed"), localizedError(error.message), "error");
  }
  renderBackups();
}

function askConfirmation({ title, text, summary, confirmLabel = t("confirm"), danger = false }) {
  return new Promise((resolve) => {
    const dialog = $("confirmDialog");
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;
    $("confirmSummary").replaceChildren(...summary.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
    const accept = $("acceptConfirm");
    accept.textContent = confirmLabel;
    accept.className = `button ${danger ? "danger-solid" : "primary"}`;

    const finish = (result) => {
      accept.onclick = null;
      $("cancelConfirm").onclick = null;
      dialog.oncancel = null;
      if (dialog.open) {
        dialog.close();
      }
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

async function mutate({ confirm, path, payload, done, failure, reloadOnError = true }) {
  if (confirm && !(await askConfirmation(confirm))) {
    return;
  }
  setMutationBusy(true);
  try {
    const result = await api(path, payload);
    await done(result);
  } catch (error) {
    showToast(failure, localizedError(error.message), "error");
    if (reloadOnError) {
      await loadLayers();
    }
  } finally {
    setMutationBusy(false);
  }
}

function writeCurrentKey() {
  const text = $("macroText").value;
  const validation = calculateEvents(text);
  if (!text || validation.error || $("writeKey").disabled) {
    return;
  }
  const layer = state.viewLayer;
  const key = state.selectedKey;
  const active = state.activeLayer;
  return mutate({
    confirm: {
      title: t("writeTitle", { key }),
      text: !active || layer === active
        ? t("writeActiveText", { profile: profileName(layer) })
        : t("writeInactiveText", { view: profileName(layer), active: profileName(active) }),
      summary: [
        `${profileName(layer)} · K${key}`,
        t("eventsCount", { count: validation.events }),
        t("backupAutomatic"),
      ],
      confirmLabel: t("writeConfirm"),
    },
    path: "/api/write",
    payload: { layer, key, text, commit: true },
    failure: t("writeFailed"),
    done: async (result) => {
      state.drafts.delete(draftId(layer, key));
      await Promise.all([loadLayers(), loadDevice(), loadBackups()]);
      const activeNote = result.layer === state.activeLayer || !state.activeLayer
        ? t("activeChange")
        : t("activeRemains", { profile: profileName(state.activeLayer) });
      showToast(
        t("writeDone", { profile: profileName(result.layer) }),
        t("writeDoneDetails", { key: result.key, activeNote, backup: result.backup }),
      );
    },
  });
}

function clearCurrentKey() {
  const layer = state.viewLayer;
  const key = state.selectedKey;
  return mutate({
    confirm: {
      title: t("clearTitle", { key }),
      text: t("clearText", { profile: profileName(layer) }),
      summary: [`${profileName(layer)} · K${key}`, t("backupAutomatic")],
      confirmLabel: t("clearConfirm"),
      danger: true,
    },
    path: "/api/clear",
    payload: { layer, key, commit: true },
    failure: t("clearFailed"),
    done: async (result) => {
      state.drafts.delete(draftId(layer, key));
      await Promise.all([loadLayers(), loadBackups()]);
      showToast(
        t("keyCleared"),
        t("keyClearedDetails", { profile: profileName(result.layer), key: result.key, backup: result.backup }),
      );
    },
  });
}

function revertCurrentKey() {
  state.drafts.delete(draftId());
  loadEditor();
  renderKeypad();
  renderProfiles();
}

function openCopyDialog() {
  const target = state.viewLayer;
  $("copyTarget").textContent = profileName(target);
  Array.from($("copySource").options).forEach((option) => {
    option.disabled = Number(option.value) === target;
  });
  $("copySource").value = String(LAYERS.find((layer) => layer !== target));
  $("copyDialog").showModal();
}

function copyLayer() {
  const source = Number($("copySource").value);
  const target = state.viewLayer;
  $("copyDialog").close();
  return mutate({
    path: "/api/copy-layer",
    payload: { source, target },
    failure: t("copyFailed"),
    done: async (result) => {
      for (const id of Array.from(state.drafts.keys())) {
        if (id.startsWith(`${target}:`)) {
          state.drafts.delete(id);
        }
      }
      await Promise.all([loadLayers(), loadBackups()]);
      showToast(
        t("profileCopied"),
        t("profileCopiedDetails", {
          source: profileName(result.source),
          target: profileName(result.target),
          backup: result.backup,
        }),
      );
    },
  });
}

function createBackup() {
  return mutate({
    path: "/api/backup",
    payload: {},
    failure: t("backupFailed"),
    reloadOnError: false,
    done: async (result) => {
      state.selectedBackup = result.backup;
      await loadBackups();
      showToast(t("backupCreated"), result.backup);
    },
  });
}

function restoreBackup() {
  const backup = state.selectedBackup;
  if (!backup) {
    return;
  }
  $("backupDialog").close();
  return mutate({
    confirm: {
      title: t("restoreTitle"),
      text: t("restoreText"),
      summary: [backup, t("draftsDeleted")],
      confirmLabel: t("restoreConfirm"),
      danger: true,
    },
    path: "/api/restore",
    payload: { backup },
    failure: t("restoreFailed"),
    done: async () => {
      state.drafts.clear();
      await Promise.all([loadLayers(), loadDevice()]);
      showToast(t("restoreDone"), backup);
    },
  });
}

function insertToken(token) {
  const textarea = $("macroText");
  textarea.setRangeText(`{${token}}`, textarea.selectionStart, textarea.selectionEnd, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

function buildTokens(container, tokens) {
  container.replaceChildren(...tokens.map((token) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = TOKEN_LABELS[token];
    button.title = `{${token}}`;
    button.addEventListener("click", () => insertToken(token));
    return button;
  }));
}

function changeLanguage(language) {
  if (!(language in I18N)) {
    return;
  }
  state.language = language;
  localStorage.setItem("k08-language", language);
  applyStaticTranslations();
  setDeviceError(state.connected ? state.deviceError : t("reconnect"));
  render();
  loadEditor();
  renderBackups();
}

function moveKey(event) {
  const key = state.selectedKey;
  const column = (key - 1) % 4;
  const row = key <= 4 ? 0 : 1;
  const moves = {
    ArrowUp: [column, row - 1],
    ArrowDown: [column, row + 1],
    ArrowLeft: [column - 1, row],
    ArrowRight: [column + 1, row],
  };
  const target = moves[event.key];
  if (!target) {
    return;
  }
  event.preventDefault();
  const [nextColumn, nextRow] = target;
  if (nextColumn < 0 || nextColumn > 3 || nextRow < 0 || nextRow > 1) {
    return;
  }
  selectKey(nextRow * 4 + nextColumn + 1, true);
}

function moveLayer(event) {
  const index = LAYERS.indexOf(state.viewLayer);
  const moves = {
    ArrowUp: index - 1,
    ArrowLeft: index - 1,
    ArrowDown: index + 1,
    ArrowRight: index + 1,
    Home: 0,
    End: LAYERS.length - 1,
  };
  if (moves[event.key] === undefined) {
    return;
  }
  event.preventDefault();
  const next = LAYERS[(moves[event.key] + LAYERS.length) % LAYERS.length];
  selectLayer(next, true);
}

function handleShortcut(event) {
  if (anyDialogOpen()) {
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    writeCurrentKey();
    return;
  }
  const typing = event.target.closest("textarea, input, select");
  if (typing || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }
  const key = Number(event.key);
  if (KEYS.includes(key)) {
    event.preventDefault();
    selectKey(key, true);
  }
}

function bindEvents() {
  document.querySelectorAll("#layerTabs [data-layer]").forEach((button) => {
    button.addEventListener("click", () => selectLayer(Number(button.dataset.layer)));
  });
  $("layerTabs").addEventListener("keydown", moveLayer);
  $("keypad").addEventListener("keydown", moveKey);
  document.addEventListener("keydown", handleShortcut);
  $("macroText").addEventListener("input", () => {
    const value = $("macroText").value;
    if (value === storedText()) {
      state.drafts.delete(draftId());
    } else {
      state.drafts.set(draftId(), value);
    }
    renderKeypad();
    renderProfiles();
    renderEditorStatus();
  });
  $("revealText").addEventListener("click", () => {
    state.revealed = !state.revealed;
    renderEditorStatus();
  });
  $("privacyToggle").addEventListener("change", () => {
    document.body.classList.toggle("privacy-on", isPrivate());
    localStorage.setItem("k08-private", isPrivate() ? "1" : "0");
    state.revealed = false;
    renderKeypad();
    renderEditorStatus();
  });
  $("languageSelect").addEventListener("change", (event) => changeLanguage(event.target.value));
  $("refreshDevice").addEventListener("click", refreshAll);
  $("retryDevice").addEventListener("click", refreshAll);
  $("writeKey").addEventListener("click", writeCurrentKey);
  $("clearKey").addEventListener("click", clearCurrentKey);
  $("revertKey").addEventListener("click", revertCurrentKey);
  $("copyLayer").addEventListener("click", openCopyDialog);
  $("confirmCopy").addEventListener("click", copyLayer);
  $("openBackups").addEventListener("click", async () => {
    $("backupDialog").showModal();
    await loadBackups();
  });
  $("closeBackups").addEventListener("click", () => $("backupDialog").close());
  $("createBackup").addEventListener("click", createBackup);
  $("restoreBackup").addEventListener("click", restoreBackup);
  $("toastClose").addEventListener("click", () => {
    $("toast").hidden = true;
  });
  document.addEventListener("visibilitychange", checkDevice);
  window.addEventListener("focus", checkDevice);
  window.setInterval(() => {
    if (!state.connected) {
      checkDevice();
    }
  }, 4000);
  window.addEventListener("beforeunload", (event) => {
    if (!state.drafts.size) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  });
}

async function init() {
  applyStaticTranslations();
  $("privacyToggle").checked = localStorage.getItem("k08-private") !== "0";
  document.body.classList.toggle("privacy-on", isPrivate());
  buildKeypad();
  buildTokens($("tokenKeys"), KEY_TOKENS);
  buildTokens($("tokenShortcuts"), SHORTCUT_TOKENS);
  bindEvents();
  render();
  loadEditor();
  await refreshAll();
}

init();
