// Shared data layer over chrome.storage.local
// Data shape:
// { groups: [{id, name, color}], notes: [{id, groupId, text, createdAt, order}] }
// "order" sorts notes ascending within a group. New notes get a smaller
// (more negative) order so they land at the top, matching the old newest
// first behavior. Dragging a note sets its order to a value between its
// new neighbors, so only the moved note needs to change.

const CAPPB_PALETTE = ["#b5533c", "#c9a227", "#7c9473", "#6b8caf", "#8b5a7c", "#5c6670"];

const CAPPB_DEFAULTS = {
  groups: [{ id: "unsorted", name: "Unsorted", color: "#5c6670" }],
  notes: []
};

function cappbUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["groups", "notes"], (res) => {
      const groups = res.groups && res.groups.length ? res.groups : CAPPB_DEFAULTS.groups;
      const notes = res.notes || CAPPB_DEFAULTS.notes;
      resolve({ groups, notes });
    });
  });
}

function setData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function addGroup(name, color) {
  const data = await getData();
  const group = { id: cappbUid(), name: name.trim(), color: color || CAPPB_PALETTE[data.groups.length % CAPPB_PALETTE.length] };
  data.groups.push(group);
  await setData(data);
  return group;
}

async function renameGroup(groupId, name) {
  const data = await getData();
  const g = data.groups.find((g) => g.id === groupId);
  if (g) g.name = name.trim();
  await setData(data);
}

async function deleteGroup(groupId) {
  const data = await getData();
  data.groups = data.groups.filter((g) => g.id !== groupId);
  data.notes = data.notes.filter((n) => n.groupId !== groupId);
  if (data.groups.length === 0) data.groups = CAPPB_DEFAULTS.groups;
  await setData(data);
}

async function addNote(groupId, text) {
  const data = await getData();
  const note = { id: cappbUid(), groupId, text: text.trim(), createdAt: Date.now(), order: -Date.now() };
  data.notes.unshift(note);
  await setData(data);
  return note;
}

async function deleteNote(noteId) {
  const data = await getData();
  data.notes = data.notes.filter((n) => n.id !== noteId);
  await setData(data);
}

async function editNote(noteId, text) {
  const data = await getData();
  const n = data.notes.find((n) => n.id === noteId);
  if (n) n.text = text.trim();
  await setData(data);
}

async function moveNote(noteId, newGroupId) {
  const data = await getData();
  const n = data.notes.find((n) => n.id === noteId);
  if (n) n.groupId = newGroupId;
  await setData(data);
}

// Sort key for a note: uses the manual order field when present, and
// falls back to newest first for notes saved before drag and drop existed.
function cappbSortKey(note) {
  return typeof note.order === "number" ? note.order : -note.createdAt;
}

// Moves a note to a group and gives it an order value that places it
// between beforeNote and afterNote (either can be null at a list end).
async function reorderNote(noteId, newGroupId, beforeNote, afterNote) {
  const data = await getData();
  const n = data.notes.find((n) => n.id === noteId);
  if (!n) return;

  const beforeKey = beforeNote ? cappbSortKey(beforeNote) : null;
  const afterKey = afterNote ? cappbSortKey(afterNote) : null;

  let newOrder;
  if (beforeKey !== null && afterKey !== null) {
    newOrder = (beforeKey + afterKey) / 2;
  } else if (beforeKey !== null) {
    newOrder = beforeKey + 1;
  } else if (afterKey !== null) {
    newOrder = afterKey - 1;
  } else {
    newOrder = -Date.now();
  }

  n.groupId = newGroupId;
  n.order = newOrder;
  await setData(data);
}
