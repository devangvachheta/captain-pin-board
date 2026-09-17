// Element refs
const msgText = document.getElementById("msgText");
const groupSelect = document.getElementById("groupSelect");
const saveBtn = document.getElementById("saveBtn");
const statusMsg = document.getElementById("statusMsg");
const openBoard = document.getElementById("openBoard");
const captureAreaBtn = document.getElementById("captureAreaBtn");
const pasteBtn = document.getElementById("pasteBtn");
const collectionsCount = document.getElementById("collectionsCount");

const homeView = document.getElementById("homeView");
const detailView = document.getElementById("detailView");

const newGroupBtn = document.getElementById("newGroupBtn");
const newGroupRow = document.getElementById("newGroupRow");
const newGroupName = document.getElementById("newGroupName");
const createGroupBtn = document.getElementById("createGroupBtn");
const collectionsList = document.getElementById("collectionsList");

const backBtn = document.getElementById("backBtn");
const detailName = document.getElementById("detailName");
const deleteGroupBtn = document.getElementById("deleteGroupBtn");
const addItemForm = document.getElementById("addItemForm");
const addItemText = document.getElementById("addItemText");
const itemsList = document.getElementById("itemsList");

let currentGroupId = null; // when set, we are inside a collection

// Collections dropdown used by the quick pin box
async function populateGroupSelect(selectId) {
  const data = await getData();
  groupSelect.innerHTML = "";
  data.groups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });
  if (selectId) groupSelect.value = selectId;
}

// Home view: list of collections
async function renderCollections() {
  const data = await getData();
  collectionsList.innerHTML = "";
  collectionsCount.textContent = data.groups.length;

  if (data.groups.length === 0) {
    collectionsList.innerHTML = '<li class="cappb-empty-hint">No collections yet, create one above.</li>';
    return;
  }

  data.groups.forEach((group) => {
    const count = data.notes.filter((n) => n.groupId === group.id).length;
    const li = document.createElement("li");
    li.className = "cappb-collection-row";
    li.style.borderLeftColor = group.color;
    li.innerHTML = `
      <span class="cappb-collection-info">
        <div class="cappb-collection-name"></div>
        <div class="cappb-collection-count"></div>
      </span>
      <span class="cappb-collection-chevron">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    `;
    li.querySelector(".cappb-collection-name").textContent = group.name;
    li.querySelector(".cappb-collection-count").textContent =
      count === 0 ? "Empty" : `${count} message${count > 1 ? "s" : ""}`;
    li.addEventListener("click", () => openCollection(group.id));
    collectionsList.appendChild(li);
  });
}

// Detail view: items inside one collection
async function openCollection(groupId) {
  currentGroupId = groupId;
  homeView.classList.add("cappb-hidden");
  detailView.classList.remove("cappb-hidden");
  await renderDetail();
}

function closeCollection() {
  currentGroupId = null;
  detailView.classList.add("cappb-hidden");
  homeView.classList.remove("cappb-hidden");
  renderCollections();
}

async function renderDetail() {
  const data = await getData();
  const group = data.groups.find((g) => g.id === currentGroupId);
  if (!group) { closeCollection(); return; }

  detailName.value = group.name;
  itemsList.innerHTML = "";

  const items = data.notes
    .filter((n) => n.groupId === currentGroupId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (items.length === 0) {
    itemsList.innerHTML = '<li class="cappb-empty-hint">Nothing pinned here yet.</li>';
    return;
  }

  items.forEach((note) => {
    const li = document.createElement("li");
    li.className = "cappb-item-row cappb-pin-card";
    li.style.borderLeftColor = group.color;

    if (note.type === "image") {
      li.innerHTML = `
        <img class="cappb-item-image cappb-pin-image" alt="Pinned screenshot" />
        <div class="cappb-pin-footer">
          <span></span>
          <span class="cappb-pin-actions">
            <button class="cappb-btn cappb-btn--icon cappb-view-item">View</button>
            <button class="cappb-btn cappb-btn--icon cappb-copy-item">Copy</button>
            <button class="cappb-btn cappb-btn--icon cappb-download-item">Download</button>
            <button class="cappb-btn cappb-btn--icon cappb-btn--danger cappb-delete-item">Delete</button>
          </span>
        </div>
      `;
      const imgEl = li.querySelector(".cappb-item-image");
      imgEl.src = note.imageData;
      li.querySelector(".cappb-pin-footer span").textContent = cappbFormatDate(note.createdAt);

      cappbAttachCopy(li.querySelector(".cappb-copy-item"), () => note.imageData, "image");
      cappbAttachView(li.querySelector(".cappb-view-item"), () => note.imageData, "image");
      cappbAttachDownload(li.querySelector(".cappb-download-item"), () => note.imageData);
      imgEl.addEventListener("click", () => cappbShowImageModal(note.imageData));

      li.querySelector(".cappb-delete-item").addEventListener("click", async () => {
        if (!confirm("Delete this pinned image? This cannot be undone.")) return;
        await deleteNote(note.id);
        await renderDetail();
      });

      itemsList.appendChild(li);
      return;
    }

    li.innerHTML = `
      <p class="cappb-item-text cappb-pin-text" contenteditable="false" spellcheck="false" title="Click to edit"></p>
      <div class="cappb-pin-footer">
        <span></span>
        <span class="cappb-pin-actions">
          <button class="cappb-btn cappb-btn--icon cappb-view-item">View</button>
          <button class="cappb-btn cappb-btn--icon cappb-copy-item">Copy</button>
          <button class="cappb-btn cappb-btn--icon cappb-edit-item">Edit</button>
          <button class="cappb-btn cappb-btn--icon cappb-btn--danger cappb-delete-item">Delete</button>
        </span>
      </div>
    `;
    const textEl = li.querySelector(".cappb-item-text");
    textEl.textContent = note.text;
    li.querySelector(".cappb-pin-footer span").textContent = cappbFormatDate(note.createdAt);

    const editBtn = li.querySelector(".cappb-edit-item");
    cappbAttachInlineEdit(textEl, editBtn, note.text, async (newText) => {
      await editNote(note.id, newText);
      note.text = newText;
    });

    cappbAttachCopy(li.querySelector(".cappb-copy-item"), () => textEl.textContent);
    cappbAttachView(li.querySelector(".cappb-view-item"), () => textEl.textContent);

    li.querySelector(".cappb-delete-item").addEventListener("click", async () => {
      if (!confirm("Delete this pinned message? This cannot be undone.")) return;
      await deleteNote(note.id);
      await renderDetail();
    });

    itemsList.appendChild(li);
  });
}

detailName.addEventListener("change", async () => {
  if (!currentGroupId) return;
  await renameGroup(currentGroupId, detailName.value || "Untitled");
});

deleteGroupBtn.addEventListener("click", async () => {
  const data = await getData();
  if (data.groups.length === 1) {
    alert("Keep at least one collection, rename it instead.");
    return;
  }
  const group = data.groups.find((g) => g.id === currentGroupId);
  if (confirm(`Delete "${group.name}" and everything pinned inside it?`)) {
    await deleteGroup(currentGroupId);
    closeCollection();
  }
});

backBtn.addEventListener("click", closeCollection);

addItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = addItemText.value.trim();
  if (!text || !currentGroupId) return;
  await addNote(currentGroupId, text);
  addItemText.value = "";
  await renderDetail();
});

// New collection (from home view)
newGroupBtn.addEventListener("click", () => {
  newGroupRow.classList.toggle("cappb-hidden");
  newGroupName.focus();
});

createGroupBtn.addEventListener("click", async () => {
  const name = newGroupName.value.trim();
  if (!name) return;
  const group = await addGroup(name);
  await populateGroupSelect(group.id);
  await renderCollections();
  newGroupName.value = "";
  newGroupRow.classList.add("cappb-hidden");
});

newGroupName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createGroupBtn.click();
});

// Shows a status message and, when a duration is given, hides it again
// afterward so it never sits there as blank reserved space.
function cappbShowStatus(text, color, duration) {
  statusMsg.textContent = text;
  statusMsg.style.color = color;
  statusMsg.classList.remove("cappb-hidden");
  if (duration) {
    setTimeout(() => {
      statusMsg.classList.add("cappb-hidden");
      statusMsg.textContent = "";
    }, duration);
  }
}

// Quick pin
saveBtn.addEventListener("click", async () => {
  const text = msgText.value.trim();
  if (!text) {
    cappbShowStatus("Write or paste a message first.", "#b5533c", 2000);
    return;
  }
  const groupId = groupSelect.value;
  await addNote(groupId, text);
  chrome.storage.local.set({ lastUsedGroup: groupId });
  msgText.value = "";
  cappbShowStatus("Pinned", "#7c9473", 1800);
  await renderCollections();
  if (currentGroupId === groupId) await renderDetail();
});

openBoard.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/pages/board/board.html") });
});

captureAreaBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.runtime.sendMessage({ type: "cappb-start-capture", tabId: tab ? tab.id : null });
  } catch (e) {
    // Background may not have a listener ready yet on a very first run, ignore.
  }
  window.close();
});

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      msgText.value = text;
      msgText.focus();
    }
  } catch (e) {
    cappbShowStatus("Could not read clipboard, paste manually.", "#b5533c", 2000);
  }
});

// Init
async function init() {
  const { lastUsedGroup } = await new Promise((res) =>
    chrome.storage.local.get(["lastUsedGroup"], res)
  );
  await populateGroupSelect(lastUsedGroup);
  await renderCollections();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });
    if (result) msgText.value = result;
  } catch (e) {
    // Restricted pages such as chrome:// or the Web Store block scripting, safe to ignore.
  }
}

init();
