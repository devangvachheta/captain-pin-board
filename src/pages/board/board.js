const boardEl = document.getElementById("board");
const columnTemplate = document.getElementById("columnTemplate");
const noteTemplate = document.getElementById("noteTemplate");
const imageNoteTemplate = document.getElementById("imageNoteTemplate");
const searchInput = document.getElementById("searchInput");
const addTopicBtn = document.getElementById("addTopicBtn");

let cachedData = { groups: [], notes: [] };
let searchTerm = "";

function cappbMatchesSearch(note) {
  if (!searchTerm) return true;
  return note.text.toLowerCase().includes(searchTerm.toLowerCase());
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
      .sort((a, b) => cappbSortKey(a) - cappbSortKey(b));

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
