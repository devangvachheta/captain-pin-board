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

// Quick find opens as a small popup window. If it is already open, it is
// brought to the front instead of opening a second one.
let cappbQuickWindowId = null;

async function cappbOpenQuickSearch() {
  if (cappbQuickWindowId !== null) {
    try {
      await chrome.windows.update(cappbQuickWindowId, { focused: true });
      return;
    } catch (e) {
      cappbQuickWindowId = null;
    }
  }
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL("src/pages/quick/quick.html"),
    type: "popup",
    width: 520,
    height: 520,
    focused: true
  });
  cappbQuickWindowId = win.id;
}

chrome.windows.onRemoved.addListener((id) => {
  if (id === cappbQuickWindowId) cappbQuickWindowId = null;
});

// Keyboard shortcuts, all customizable at chrome://extensions/shortcuts:
//   Alt+Shift+E  opens the popup (the built in _execute_action command)
//   Alt+Shift+C  starts an area capture
//   Alt+Shift+O  opens the full board
//   Alt+Shift+F  opens quick find
chrome.commands.onCommand.addListener((command) => {
  if (command === "open_full_board") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/pages/board/board.html") });
  }
  if (command === "quick_search") {
    cappbOpenQuickSearch().catch((e) => console.error("Captain Pin Board: could not open quick find", e));
  }
  if (command === "capture_area") {
    cappbStartCapture().catch((e) => {
      console.error("Captain Pin Board: could not start capture", e);
      cappbShowCaptureError();
    });
  }
});

// Injected into the active tab. The user drags a selection box, snipping
// tool style, then can draw on it (arrow, box, pen, text) and pick what to
// do with it from a small action bar: pin it to a collection, copy it,
// download it, or cancel. Must be fully self contained since it runs in
// the page, not in this service worker.
// The screenshot itself is taken by the service worker after this UI is
// hidden, and the drawings are sent along as plain shape data so the
// service worker can paint them onto the picture (see cappbDrawShapes,
// which must draw exactly like drawShapes below).
function cappbCaptureOverlayFn() {
  if (document.getElementById("cappb-capture-host")) return;

  const FONT = "700 18px system-ui, sans-serif";
  const LINE = 3;
  const COLORS = ["#e53935", "#fbc02d", "#43a047", "#1e88e5", "#212121"];

  function drawShapes(ctx, list, k) {
    ctx.save();
    ctx.scale(k, k);
    ctx.lineWidth = LINE;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    list.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      if (s.type === "rect") {
        ctx.strokeRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
      } else if (s.type === "arrow") {
        const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        const head = 14;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2 - Math.cos(a) * (head - 3), s.y2 - Math.sin(a) * (head - 3));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(s.x2 - head * Math.cos(a - Math.PI / 6), s.y2 - head * Math.sin(a - Math.PI / 6));
        ctx.lineTo(s.x2 - head * Math.cos(a + Math.PI / 6), s.y2 - head * Math.sin(a + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (s.type === "pen") {
        if (s.pts.length === 1) {
          ctx.beginPath();
          ctx.arc(s.pts[0][0], s.pts[0][1], LINE / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(s.pts[0][0], s.pts[0][1]);
          s.pts.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
          ctx.stroke();
        }
      } else if (s.type === "text") {
        ctx.font = FONT;
        ctx.textBaseline = "top";
        ctx.fillText(s.text, s.x, s.y);
      }
    });
    ctx.restore();
  }

  const host = document.createElement("div");
  host.id = "cappb-capture-host";
  Object.assign(host.style, { position: "fixed", inset: "0", zIndex: "2147483647", cursor: "crosshair" });
  const root = host.attachShadow({ mode: "closed" });

  const css =
    ".box{position:fixed;display:none;pointer-events:none;border:1px solid #fff;outline:1px dashed #b5533c;box-shadow:0 0 0 9999px rgba(0,0,0,.35)}" +
    ".size{position:fixed;display:none;pointer-events:none;background:rgba(30,30,30,.88);color:#fff;font:12px/1 system-ui,sans-serif;padding:5px 8px;border-radius:4px}" +
    ".draw{position:fixed;display:none;pointer-events:none}" +
    ".txt{position:fixed;display:none;margin:0;padding:0;min-width:90px;border:1px dashed #888;background:rgba(255,255,255,.7);font:" + FONT + ";outline:none}" +
    ".bar,.tools{position:fixed;display:none;align-items:center;gap:6px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:6px;box-shadow:0 4px 16px rgba(0,0,0,.3);cursor:default;font:12px system-ui,sans-serif;color:#2b2b2b}" +
    ".tools{flex-direction:column;gap:4px}" +
    ".btn{border:0;background:#f2eee3;color:#2b2b2b;border-radius:6px;padding:7px 11px;cursor:pointer;font:600 12px system-ui,sans-serif}" +
    ".btn:hover{background:#e4ded0}.pin{background:#b5533c;color:#fff}.pin:hover{background:#9c4632}" +
    ".tbtn{width:30px;height:30px;border:0;border-radius:6px;background:#f2eee3;color:#2b2b2b;cursor:pointer;font:700 15px/1 system-ui,sans-serif;padding:0}" +
    ".tbtn:hover{background:#e4ded0}.tbtn.on{background:#b5533c;color:#fff}" +
    ".dot{width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #bbb;cursor:pointer;padding:0}.dot.on{box-shadow:0 0 0 2px #212121}" +
    ".sep{width:22px;height:1px;background:#ddd;margin:2px 0}" +
    ".sel{max-width:130px;border:1px solid #ccc;border-radius:6px;padding:6px;background:#fff;color:#2b2b2b;font:12px system-ui,sans-serif}";
  if (typeof CSSStyleSheet === "function" && "replaceSync" in CSSStyleSheet.prototype && "adoptedStyleSheets" in root) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement("style");
    style.textContent = css;
    root.appendChild(style);
  }

  const make = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const box = make("div", "box");
  const sizeLabel = make("div", "size");
  const draw = make("canvas", "draw");
  const txt = make("input", "txt");
  txt.type = "text";
  const tools = make("div", "tools");
  const bar = make("div", "bar");

  // Drawing tools (left column next to the selection)
  const toolDefs = [
    { id: "arrow", label: "↗", title: "Arrow" },
    { id: "rect", label: "▭", title: "Box" },
    { id: "pen", label: "✎", title: "Pen" },
    { id: "text", label: "T", title: "Text" }
  ];
  const toolBtns = {};
  toolDefs.forEach((t) => {
    const b = make("button", "tbtn", t.label);
    b.title = t.title;
    b.addEventListener("click", () => setTool(t.id));
    toolBtns[t.id] = b;
    tools.appendChild(b);
  });
  tools.appendChild(make("div", "sep"));
  const dotBtns = COLORS.map((c) => {
    const d = make("button", "dot");
    d.style.background = c;
    d.title = "Color";
    d.addEventListener("click", () => setColor(c));
    tools.appendChild(d);
    return d;
  });
  tools.appendChild(make("div", "sep"));
  const undoBtn = make("button", "tbtn", "↶");
  undoBtn.title = "Undo (Ctrl+Z)";
  tools.appendChild(undoBtn);

  // Action bar (below the selection)
  const select = make("select", "sel");
  select.title = "Collection for Pin";
  const pinBtn = make("button", "btn pin", "Pin");
  pinBtn.title = "Pin to the board (Enter)";
  const copyBtn = make("button", "btn", "Copy");
  copyBtn.title = "Copy image (Ctrl+C)";
  const saveBtn = make("button", "btn", "Download");
  saveBtn.title = "Download as PNG (Ctrl+S)";
  const closeBtn = make("button", "btn", "✕");
  closeBtn.title = "Cancel (Esc)";
  bar.append(select, pinBtn, copyBtn, saveBtn, closeBtn);
  root.append(box, sizeLabel, draw, txt, tools, bar);
  document.body.appendChild(host);

  // Fill the collection list, with the last used one selected.
  chrome.storage.local.get(["groups", "lastUsedGroup"], (res) => {
    const groups = res.groups && res.groups.length ? res.groups : [{ id: "unsorted", name: "Unsorted" }];
    groups.forEach((g) => {
      const o = make("option", "", g.name);
      o.value = g.id;
      select.appendChild(o);
    });
    if (res.lastUsedGroup && groups.some((g) => g.id === res.lastUsedGroup)) select.value = res.lastUsedGroup;
  });

  let startX = 0, startY = 0, dragging = false, rect = null, busy = false;
  let tool = null, color = COLORS[0], shapes = [], cur = null, drawing = false;

  function showToast(text, isError) {
    const t = document.createElement("div");
    t.textContent = text;
    Object.assign(t.style, {
      position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647",
      background: isError ? "#b5533c" : "#2b2b2b", color: "#fff", padding: "10px 14px",
      borderRadius: "8px", font: "600 13px system-ui,sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,.3)"
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)[1];
    const bin = atob(parts[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function cleanup() {
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mousemove", onDrawMove);
    document.removeEventListener("mouseup", onDrawUp);
    document.removeEventListener("keydown", onKeydown, true);
    host.remove();
  }

  function drawSelection(x, y, w, h) {
    Object.assign(box.style, { display: "block", left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
    sizeLabel.textContent = Math.round(w) + " × " + Math.round(h);
    Object.assign(sizeLabel.style, { display: "block", left: x + "px", top: (y > 32 ? y - 28 : y + 6) + "px" });
  }

  // ---- drawing -------------------------------------------------------
  const dpr = window.devicePixelRatio || 1;
  const ctx = draw.getContext("2d");

  function redraw() {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, draw.width, draw.height);
    drawShapes(ctx, cur ? shapes.concat([cur]) : shapes, dpr);
  }

  function setTool(id) {
    commitText();
    tool = tool === id ? null : id;
    Object.keys(toolBtns).forEach((k) => toolBtns[k].classList.toggle("on", k === tool));
    draw.style.pointerEvents = tool ? "auto" : "none";
    draw.style.cursor = tool === "text" ? "text" : "crosshair";
  }

  function setColor(c) {
    color = c;
    dotBtns.forEach((d, i) => d.classList.toggle("on", COLORS[i] === c));
    txt.style.color = c;
  }
  setColor(color);

  function undo() {
    commitText();
    shapes.pop();
    redraw();
  }
  undoBtn.addEventListener("click", undo);

  const point = (e) => ({
    x: Math.max(0, Math.min(rect.w, e.clientX - rect.x)),
    y: Math.max(0, Math.min(rect.h, e.clientY - rect.y))
  });

  let textAt = null;
  function openText(p) {
    commitText();
    textAt = p;
    txt.value = "";
    Object.assign(txt.style, { display: "block", left: rect.x + p.x + "px", top: rect.y + p.y + "px" });
    txt.focus();
  }
  function commitText() {
    if (!textAt) return;
    const value = txt.value.trim();
    if (value) shapes.push({ type: "text", color, x: textAt.x, y: textAt.y, text: value });
    textAt = null;
    txt.style.display = "none";
    txt.value = "";
    txt.blur();
    redraw();
  }
  function cancelText() {
    textAt = null;
    txt.style.display = "none";
    txt.value = "";
    txt.blur();
  }
  // Keys typed into the text box must not reach the page or trigger shortcuts.
  ["keydown", "keyup", "keypress"].forEach((t) => txt.addEventListener(t, (e) => e.stopPropagation()));
  txt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitText(); }
    else if (e.key === "Escape") { e.preventDefault(); cancelText(); }
  });
  txt.addEventListener("blur", commitText);

  draw.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!tool || busy) return;
    const p = point(e);
    if (tool === "text") { openText(p); return; }
    commitText();
    drawing = true;
    cur = tool === "pen"
      ? { type: "pen", color, pts: [[p.x, p.y]] }
      : { type: tool, color, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    redraw();
  });

  function onDrawMove(e) {
    if (!drawing) return;
    const p = point(e);
    if (cur.type === "pen") {
      const last = cur.pts[cur.pts.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) >= 2) cur.pts.push([p.x, p.y]);
    } else {
      cur.x2 = p.x;
      cur.y2 = p.y;
    }
    redraw();
  }
  function onDrawUp() {
    if (!drawing) return;
    drawing = false;
    const keep = cur.type === "pen" || Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) >= 3;
    if (keep) shapes.push(cur);
    cur = null;
    redraw();
  }

  // ---- placing the bars ------------------------------------------------
  function showBars() {
    draw.width = Math.round(rect.w * dpr);
    draw.height = Math.round(rect.h * dpr);
    Object.assign(draw.style, { display: "block", left: rect.x + "px", top: rect.y + "px", width: rect.w + "px", height: rect.h + "px" });
    redraw();

    bar.style.display = "flex";
    const b = bar.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.x + rect.w - b.width, window.innerWidth - b.width - 8));
    let top = rect.y + rect.h + 8;
    if (top + b.height > window.innerHeight - 8) top = rect.y - b.height - 8;
    if (top < 8) top = Math.max(8, rect.y + rect.h - b.height - 8);
    Object.assign(bar.style, { left: left + "px", top: top + "px" });

    tools.style.display = "flex";
    const t = tools.getBoundingClientRect();
    let tl = rect.x + rect.w + 8;
    if (tl + t.width > window.innerWidth - 8) tl = rect.x - t.width - 8;
    if (tl < 8) tl = Math.max(8, rect.x + rect.w - t.width - 8);
    const tt = Math.max(8, Math.min(rect.y, window.innerHeight - t.height - 8));
    Object.assign(tools.style, { left: tl + "px", top: tt + "px" });
  }

  function hideBars() {
    bar.style.display = "none";
    tools.style.display = "none";
    draw.style.display = "none";
    cancelText();
    shapes = [];
    cur = null;
    drawing = false;
    tool = null;
    Object.keys(toolBtns).forEach((k) => toolBtns[k].classList.remove("on"));
    draw.style.pointerEvents = "none";
  }

  // ---- actions ---------------------------------------------------------
  async function run(action) {
    if (busy || !rect) return;
    commitText();
    busy = true;
    const groupId = select.value;
    // Hide the whole UI and let the page repaint before the screenshot.
    host.style.display = "none";
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))));

    let res = null;
    try {
      res = await chrome.runtime.sendMessage({
        type: "cappb-area-selected", action, groupId, rect, dpr, shapes
      });
    } catch (e) { /* reported below */ }
    cleanup();

    if (!res || !res.ok) { showToast("Could not capture this page", true); return; }
    if (action === "pin") { showToast("Pinned to your board"); return; }

    try {
      const blob = dataUrlToBlob(res.dataUrl);
      if (action === "copy") {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        showToast("Image copied");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "captain-pin-board-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        showToast("Image downloaded");
      }
    } catch (e) {
      showToast(action === "copy" ? "Copy was blocked, try Download" : "Download failed", true);
    }
  }

  pinBtn.addEventListener("click", () => run("pin"));
  copyBtn.addEventListener("click", () => run("copy"));
  saveBtn.addEventListener("click", () => run("download"));
  closeBtn.addEventListener("click", cleanup);
  // Clicks on the bars must not start a new selection underneath them.
  [bar, tools].forEach((el) =>
    ["mousedown", "mouseup", "mousemove"].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()))
  );

  // ---- selecting the area ---------------------------------------------
  function onMouseDown(e) {
    if (busy) return;
    dragging = true;
    rect = null;
    hideBars();
    startX = e.clientX;
    startY = e.clientY;
    drawSelection(startX, startY, 0, 0);
  }

  function onMouseMove(e) {
    if (!dragging) return;
    drawSelection(Math.min(e.clientX, startX), Math.min(e.clientY, startY), Math.abs(e.clientX - startX), Math.abs(e.clientY - startY));
  }

  function onMouseUp(e) {
    if (!dragging) return;
    dragging = false;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    if (w < 4 || h < 4) { cleanup(); return; } // ignore accidental clicks
    rect = { x, y, w, h };
    host.style.cursor = "default";
    showBars();
  }

  function onKeydown(e) {
    if (busy) return;
    if (root.activeElement === txt) return; // the text box handles its own keys
    if (e.key === "Escape") { cleanup(); return; }
    if (!rect) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (e.key === "Enter" && root.activeElement !== select) { e.preventDefault(); run("pin"); }
    else if (mod && key === "c") { e.preventDefault(); run("copy"); }
    else if (mod && key === "s") { e.preventDefault(); run("download"); }
    else if (mod && key === "z") { e.preventDefault(); undo(); }
  }

  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousemove", onDrawMove);
  document.addEventListener("mouseup", onDrawUp);
  document.addEventListener("keydown", onKeydown, true);
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

// Paints the user's drawings onto the cropped screenshot. Shapes are in CSS
// pixels relative to the selection, k is the device pixel ratio. This must
// draw exactly like drawShapes inside cappbCaptureOverlayFn, which is what
// the user saw while drawing.
function cappbDrawShapes(ctx, list, k) {
  ctx.save();
  ctx.scale(k, k);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  list.forEach((s) => {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    if (s.type === "rect") {
      ctx.strokeRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
    } else if (s.type === "arrow") {
      const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const head = 14;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2 - Math.cos(a) * (head - 3), s.y2 - Math.sin(a) * (head - 3));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x2, s.y2);
      ctx.lineTo(s.x2 - head * Math.cos(a - Math.PI / 6), s.y2 - head * Math.sin(a - Math.PI / 6));
      ctx.lineTo(s.x2 - head * Math.cos(a + Math.PI / 6), s.y2 - head * Math.sin(a + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (s.type === "pen") {
      if (s.pts.length === 1) {
        ctx.beginPath();
        ctx.arc(s.pts[0][0], s.pts[0][1], 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(s.pts[0][0], s.pts[0][1]);
        s.pts.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
        ctx.stroke();
      }
    } else if (s.type === "text") {
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(s.text, s.x, s.y);
    }
  });
  ctx.restore();
}

// The shapes come from the page, so only well formed ones are drawn.
function cappbCleanShapes(list) {
  if (!Array.isArray(list)) return [];
  const num = (v) => typeof v === "number" && isFinite(v);
  const out = [];
  list.slice(0, 500).forEach((s) => {
    if (!s || typeof s.color !== "string" || !/^#[0-9a-f]{6}$/i.test(s.color)) return;
    if (s.type === "arrow" || s.type === "rect") {
      if ([s.x1, s.y1, s.x2, s.y2].every(num)) out.push({ type: s.type, color: s.color, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
    } else if (s.type === "pen" && Array.isArray(s.pts)) {
      const pts = s.pts.slice(0, 5000).filter((p) => Array.isArray(p) && num(p[0]) && num(p[1]));
      if (pts.length) out.push({ type: "pen", color: s.color, pts });
    } else if (s.type === "text" && num(s.x) && num(s.y) && typeof s.text === "string" && s.text) {
      out.push({ type: "text", color: s.color, x: s.x, y: s.y, text: s.text.slice(0, 200) });
    }
  });
  return out;
}

async function cappbCaptureAndCrop(windowId, rect, dpr, shapes) {
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
  const clean = cappbCleanShapes(shapes);
  if (clean.length) cappbDrawShapes(ctx, clean, dpr);

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        const dataUrl = await cappbCaptureAndCrop(sender.tab.windowId, message.rect, message.dpr, message.shapes);
        const action = message.action || "pin";

        if (action === "pin") {
          const data = await getData();
          const groupId = data.groups.some((g) => g.id === message.groupId) ? message.groupId : data.groups[0].id;
          await addImageNote(groupId, dataUrl);
          await chrome.storage.local.set({ lastUsedGroup: groupId });
          chrome.action.setBadgeText({ text: "OK" });
          chrome.action.setBadgeBackgroundColor({ color: "#7c9473" });
          setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1200);
          sendResponse({ ok: true });
        } else {
          // Copy and download happen in the page, which has the clipboard
          // and can start a file download, so the image is sent back.
          sendResponse({ ok: true, dataUrl });
        }
      } catch (e) {
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#b5533c" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1800);
        sendResponse({ ok: false });
      }
    })();
    return true; // keep the channel open for the async response
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
