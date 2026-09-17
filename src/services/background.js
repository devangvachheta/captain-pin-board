importScripts("storage.js");

const CAPPB_ROOT_ID = "cappb-root";
const CAPPB_NEW_TOPIC_ID = "cappb-new-topic";

async function cappbRebuildMenu() {
  await chrome.contextMenus.removeAll();
  const data = await getData();

  chrome.contextMenus.create({
    id: CAPPB_ROOT_ID,
    title: 'Pin "%s" to…',
    contexts: ["selection"]
  });

  for (const group of data.groups) {
    chrome.contextMenus.create({
      id: `cappb-group-${group.id}`,
      parentId: CAPPB_ROOT_ID,
      title: group.name,
      contexts: ["selection"]
    });
  }

  chrome.contextMenus.create({
    id: CAPPB_NEW_TOPIC_ID,
    parentId: CAPPB_ROOT_ID,
    title: "＋ New topic…",
    contexts: ["selection"]
  });
}

chrome.runtime.onInstalled.addListener(cappbRebuildMenu);
chrome.runtime.onStartup.addListener(cappbRebuildMenu);

// Keyboard shortcut (default Alt+Shift+B, customizable at
// chrome://extensions/shortcuts) jumps straight to the full board,
// without needing to open the popup first.
chrome.commands.onCommand.addListener((command) => {
  if (command === "open_full_board") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/pages/board/board.html") });
  }
  if (command === "capture_area") {
    cappbStartCapture().catch((e) => {
      console.error("Captain Pin Board: could not start capture", e);
      cappbShowCaptureError();
    });
  }
});

// Injected into the active tab to let the user drag a selection box,
// snipping tool style. Must be fully self contained since it runs in
// the page, not in this service worker. Sends the chosen rectangle
// back with chrome.runtime.sendMessage when the user releases the mouse.
function cappbCaptureOverlayFn() {
  if (document.getElementById("cappb-capture-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "cappb-capture-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,0.25)",
    zIndex: "2147483647",
    cursor: "crosshair"
  });
  document.body.appendChild(overlay);

  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    border: "2px dashed #b5533c",
    background: "rgba(181,83,60,0.15)",
    zIndex: "2147483647",
    display: "none",
    pointerEvents: "none"
  });
  document.body.appendChild(box);

  let startX = 0, startY = 0, dragging = false;

  function onMouseDown(e) {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    Object.assign(box.style, { left: startX + "px", top: startY + "px", width: "0px", height: "0px", display: "block" });
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    Object.assign(box.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
  }

  function cleanup() {
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("keydown", onKeydown);
    overlay.remove();
    box.remove();
  }

  function onMouseUp(e) {
    dragging = false;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    cleanup();
    if (w < 4 || h < 4) return; // ignore accidental clicks
    chrome.runtime.sendMessage({
      type: "cappb-area-selected",
      rect: { x, y, w, h },
      dpr: window.devicePixelRatio || 1
    });
  }

  function onKeydown(e) {
    if (e.key === "Escape") cleanup();
  }

  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("keydown", onKeydown);
}

async function cappbStartCapture(tabId) {
  let targetTabId = tabId;
  if (!targetTabId) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return;
    targetTabId = tab.id;
  }
  await chrome.scripting.executeScript({ target: { tabId: targetTabId }, func: cappbCaptureOverlayFn });
}

// Service workers have no document or FileReader, so a captured blob
// is base64 encoded manually to store it as a data URL.
async function cappbBlobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function cappbCaptureAndCrop(windowId, rect, dpr) {
  const fullDataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  const fullBlob = await (await fetch(fullDataUrl)).blob();
  const bitmap = await createImageBitmap(fullBlob);

  const sx = Math.round(rect.x * dpr);
  const sy = Math.round(rect.y * dpr);
  const sw = Math.round(rect.w * dpr);
  const sh = Math.round(rect.h * dpr);

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
  return cappbBlobToDataUrl(croppedBlob);
}

function cappbShowCaptureError() {
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#b5533c" });
  chrome.action.setTitle({ title: "Captain Pin Board: cannot capture this page (try a regular website)" });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "" });
  }, 2500);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "cappb-start-capture") {
    cappbStartCapture(message.tabId).catch((e) => {
      console.error("Captain Pin Board: could not start capture", e);
      cappbShowCaptureError();
    });
    return;
  }

  if (message.type === "cappb-area-selected" && sender.tab) {
    (async () => {
      try {
        const dataUrl = await cappbCaptureAndCrop(sender.tab.windowId, message.rect, message.dpr);
        const { lastUsedGroup } = await new Promise((res) => chrome.storage.local.get(["lastUsedGroup"], res));
        const data = await getData();
        const groupId = lastUsedGroup && data.groups.some((g) => g.id === lastUsedGroup) ? lastUsedGroup : data.groups[0].id;
        await addImageNote(groupId, dataUrl);

        chrome.action.setBadgeText({ text: "OK" });
        chrome.action.setBadgeBackgroundColor({ color: "#7c9473" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1200);
      } catch (e) {
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#b5533c" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1800);
      }
    })();
  }
});

// Rebuild whenever groups change, for example when edited from the board page.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.groups) cappbRebuildMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = info.selectionText || "";
  if (!text) return;

  if (info.menuItemId === CAPPB_NEW_TOPIC_ID) {
    // Stash the pending text and open the board so the user can name the new topic.
    await chrome.storage.local.set({ pendingPin: text });
    chrome.tabs.create({ url: chrome.runtime.getURL("src/pages/board/board.html?newTopicFor=pending") });
    return;
  }

  if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("cappb-group-")) {
    const groupId = info.menuItemId.replace("cappb-group-", "");
    await addNote(groupId, text);

    chrome.action.setBadgeText({ text: "OK" });
    chrome.action.setBadgeBackgroundColor({ color: "#7c9473" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1200);
  }
});
