const boardEl = document.getElementById("board");
const columnTemplate = document.getElementById("columnTemplate");
const noteTemplate = document.getElementById("noteTemplate");
const imageNoteTemplate = document.getElementById("imageNoteTemplate");
const searchInput = document.getElementById("searchInput");
const addTopicBtn = document.getElementById("addTopicBtn");
const tagBar = document.getElementById("tagBar");

let cachedData = { groups: [], notes: [] };
let searchTerm = "";

function cappbMatchesSearch(note) {
  return cappbNoteMatches(note, searchTerm);
}

// Puts "#tag" in the search box to filter by it, or clears it when that
// tag is already the active filter.
async function cappbToggleTagFilter(tag) {
  const wanted = "#" + tag;
  searchInput.value = searchInput.value.trim().toLowerCase() === wanted ? "" : wanted;
  searchTerm = searchInput.value;
  await render();
}

// Row of every tag in use, click one to filter the whole board by it.
function cappbRenderTagBar() {
  const tags = cappbCollectTags(cachedData.notes);
  tagBar.innerHTML = "";
  tagBar.classList.toggle("cappb-hidden", tags.length === 0);
  if (tags.length === 0) return;

  const label = document.createElement("span");
  label.className = "cappb-tagbar-label";
  label.textContent = "Tags";
  tagBar.appendChild(label);

  const active = searchTerm.trim().toLowerCase();
  tags.forEach(({ tag, count }) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "cappb-tagbar-chip" + (active === "#" + tag ? " cappb-tagbar-chip--on" : "");
    chip.textContent = `#${tag} ${count}`;
    chip.addEventListener("click", () => cappbToggleTagFilter(tag));
    tagBar.appendChild(chip);
  });
}

// Given a notes container and the cursor's vertical position, finds the
// note element the dragged card should be inserted before. Returns null
// to mean "insert at the end".
function cappbGetDragAfterElement(container, y) {
  const candidates = [...container.querySelectorAll(".cappb-note:not(.cappb-note--dragging)")];
  return candidates.reduce(
    (closest, el) => {
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: el };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

async function render() {
  cachedData = await getData();
  boardEl.innerHTML = "";
  cappbRenderTagBar();

  cachedData.groups.forEach((group) => {
    const col = columnTemplate.content.firstElementChild.cloneNode(true);
    col.style.setProperty("--cappb-group-color", group.color);
    col.dataset.groupId = group.id;

    const nameInput = col.querySelector(".cappb-group-name");
    nameInput.value = group.name;
    nameInput.addEventListener("change", async () => {
      await renameGroup(group.id, nameInput.value || "Untitled");
      await render();
    });

    const colorBtn = col.querySelector(".cappb-color-btn");
    const swatchWrap = col.querySelector(".cappb-color-swatches");
    CAPPB_PALETTE.forEach((color) => {
      const sw = document.createElement("span");
      sw.className = "cappb-swatch";
      sw.style.background = color;
      sw.addEventListener("click", async () => {
        const data = await getData();
        const g = data.groups.find((g) => g.id === group.id);
        g.color = color;
        await setData(data);
        await render();
      });
      swatchWrap.appendChild(sw);
    });
    colorBtn.addEventListener("click", () => swatchWrap.classList.toggle("cappb-hidden"));

    col.querySelector(".cappb-delete-group-btn").addEventListener("click", async () => {
      if (cachedData.groups.length === 1) {
        alert("Keep at least one topic, rename it instead of deleting.");
        return;
      }
      if (confirm(`Delete "${group.name}" and all its pinned messages?`)) {
        await deleteGroup(group.id);
        await render();
      }
    });

    const form = col.querySelector(".cappb-add-note-form");
    const textarea = form.querySelector("textarea");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;
      await addNote(group.id, text);
      textarea.value = "";
      await render();
    });

    const notesWrap = col.querySelector(".cappb-notes");
    const groupNotes = cachedData.notes
      .filter((n) => n.groupId === group.id)
      .filter(cappbMatchesSearch)
      .sort(cappbCompareNotes);

    if (groupNotes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "cappb-empty-column";
      empty.textContent = searchTerm ? "No matches here." : "No messages pinned yet.";
      notesWrap.appendChild(empty);
    }

    // Dropping a dragged note anywhere in this column, including empty space
    // below the last card, repositions it live while dragging.
    notesWrap.addEventListener("dragover", (e) => {
      const dragging = boardEl.querySelector(".cappb-note--dragging");
      if (!dragging) return;
      e.preventDefault();
      const afterElement = cappbGetDragAfterElement(notesWrap, e.clientY);
      if (afterElement == null) {
        notesWrap.appendChild(dragging);
      } else {
        notesWrap.insertBefore(dragging, afterElement);
      }
    });

    groupNotes.forEach((note) => {
      const isImage = note.type === "image";
      const template = isImage ? imageNoteTemplate : noteTemplate;
      const noteEl = template.content.firstElementChild.cloneNode(true);
      noteEl.draggable = true;
      noteEl.dataset.noteId = note.id;
      if (note.starred) noteEl.classList.add("cappb-pin-card--starred");

      cappbAttachStar(noteEl.querySelector(".cappb-note-star"), note, render);
      cappbAttachTags(noteEl.querySelector(".cappb-tags"), note, {
        onChange: render,
        onTagClick: cappbToggleTagFilter
      });

      let textEl = null;
      if (isImage) {
        const imgEl = noteEl.querySelector(".cappb-note-image");
        imgEl.src = note.imageData;
        imgEl.addEventListener("click", () => cappbShowImageModal(note.imageData));
      } else {
        textEl = noteEl.querySelector(".cappb-note-text");
        textEl.textContent = note.text;
      }
      noteEl.querySelector(".cappb-note-date").textContent = cappbFormatDate(note.createdAt);

      noteEl.addEventListener("dragstart", (e) => {
        if (textEl && textEl.getAttribute("contenteditable") === "true") {
          e.preventDefault();
          return;
        }
        noteEl.classList.add("cappb-note--dragging");
      });

      noteEl.addEventListener("dragend", async () => {
        noteEl.classList.remove("cappb-note--dragging");
        const parentColumn = noteEl.closest(".cappb-column");
        const newGroupId = parentColumn ? parentColumn.dataset.groupId : note.groupId;
        const siblings = [...noteEl.parentElement.querySelectorAll(".cappb-note")];
        const index = siblings.indexOf(noteEl);
        const beforeId = index > 0 ? siblings[index - 1].dataset.noteId : null;
        const afterId = index < siblings.length - 1 ? siblings[index + 1].dataset.noteId : null;
        const beforeNote = beforeId ? cachedData.notes.find((n) => n.id === beforeId) : null;
        const afterNote = afterId ? cachedData.notes.find((n) => n.id === afterId) : null;
        await reorderNote(note.id, newGroupId, beforeNote, afterNote);
        await render();
      });

      if (isImage) {
        cappbAttachCopy(noteEl.querySelector(".cappb-note-copy"), () => note.imageData, "image");
        cappbAttachView(noteEl.querySelector(".cappb-note-view"), () => note.imageData, "image");
        cappbAttachDownload(noteEl.querySelector(".cappb-note-download"), () => note.imageData);
      } else {
        const editBtn = noteEl.querySelector(".cappb-note-edit");
        cappbAttachInlineEdit(textEl, editBtn, note.text, async (newText) => {
          await editNote(note.id, newText);
          await render();
        });
        cappbAttachCopy(noteEl.querySelector(".cappb-note-copy"), () => textEl.textContent);
        cappbAttachView(noteEl.querySelector(".cappb-note-view"), () => textEl.textContent);
      }

      const moveSelect = noteEl.querySelector(".cappb-note-move");
      cachedData.groups.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = g.name;
        if (g.id === note.groupId) opt.selected = true;
        moveSelect.appendChild(opt);
      });
      moveSelect.addEventListener("change", async () => {
        await moveNote(note.id, moveSelect.value);
        await render();
      });

      noteEl.querySelector(".cappb-note-delete").addEventListener("click", async () => {
        if (!confirm(`Delete this pinned ${isImage ? "image" : "message"}? This cannot be undone.`)) return;
        await deleteNote(note.id);
        await render();
      });

      notesWrap.appendChild(noteEl);
    });

    boardEl.appendChild(col);
  });
}

addTopicBtn.addEventListener("click", async () => {
  const name = prompt("Name this topic, for example Marketing, Family, Work:");
  if (!name || !name.trim()) return;
  await addGroup(name.trim());
  await render();
});

// ---- Export / Import ----------------------------------------------------

function cappbNotify(message) {
  alert(message);
}

document.getElementById("exportBtn").addEventListener("click", async () => {
  const backup = await cappbBuildBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cappbBackupFileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const importFile = document.getElementById("importFile");
document.getElementById("importBtn").addEventListener("click", () => {
  importFile.value = "";
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const file = importFile.files[0];
  if (!file) return;
  let incoming;
  try {
    incoming = cappbParseBackup(await file.text());
  } catch (e) {
    cappbNotify(e.message);
    return;
  }
  cappbShowImportDialog(incoming);
});

// Asks whether to merge or replace, then applies the chosen import.
function cappbShowImportDialog(incoming) {
  const backdrop = document.createElement("div");
  backdrop.className = "cappb-modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "cappb-modal";

  const title = document.createElement("h2");
  title.textContent = "Import backup";
  title.className = "cappb-import-title";
  const info = document.createElement("p");
  info.textContent = `This file has ${incoming.groups.length} collection(s) and ${incoming.notes.length} pin(s).`;
  const mergeNote = document.createElement("p");
  mergeNote.className = "cappb-import-help";
  mergeNote.innerHTML = "<b>Merge</b> adds what is missing and keeps everything you have now.<br><b>Replace all</b> deletes your current pins and uses only this file.";

  const actions = document.createElement("div");
  actions.className = "cappb-import-actions";
  const close = () => backdrop.remove();
  const mkBtn = (label, cls, handler) => {
    const b = document.createElement("button");
    b.className = "cappb-btn " + cls;
    b.textContent = label;
    b.addEventListener("click", handler);
    actions.appendChild(b);
    return b;
  };

  const finish = async (buildData, successMessage) => {
    try {
      const current = await getData();
      const result = buildData(current);
      await cappbSaveStrict(result.data);
      close();
      await render();
      cappbNotify(successMessage(result));
    } catch (e) {
      close();
      cappbNotify("Import failed, nothing was changed. " + e.message);
    }
  };

  mkBtn("Merge", "cappb-btn--primary", () =>
    finish(
      (cur) => cappbMergeBackup(cur, incoming),
      (r) => `Added ${r.addedNotes} pin(s) and ${r.addedGroups} collection(s).`
    )
  );
  mkBtn("Replace all", "cappb-btn--ghost", () => {
    if (!confirm("This deletes all your current pins and cannot be undone. Continue?")) return;
    finish(
      () => ({ data: cappbReplaceWithBackup(incoming) }),
      () => "Backup restored."
    );
  });
  mkBtn("Cancel", "cappb-btn--ghost", close);

  modal.append(title, info, mergeNote, actions);
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.body.appendChild(backdrop);
}

document.getElementById("helpBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/pages/help/help.html") });
});

searchInput.addEventListener("input", async () => {
  searchTerm = searchInput.value;
  await render();
});

async function handlePendingPin() {
  const params = new URLSearchParams(location.search);
  if (params.get("newTopicFor") !== "pending") return;
  const { pendingPin } = await new Promise((res) => chrome.storage.local.get(["pendingPin"], res));
  if (!pendingPin) return;
  const name = prompt("Name the new topic for this pinned message:");
  chrome.storage.local.remove("pendingPin");
  if (!name || !name.trim()) return;
  const group = await addGroup(name.trim());
  await addNote(group.id, pendingPin);
  history.replaceState(null, "", "board.html");
}

(async function init() {
  await handlePendingPin();
  await render();
})();
