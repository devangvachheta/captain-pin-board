// Export and import of all pins as one JSON file.
// Needs storage.js to be loaded first.
//
// File shape:
// { app: "captain-pin-board", format: 1, exportedAt, groups: [...], notes: [...] }

const CAPPB_BACKUP_APP = "captain-pin-board";
const CAPPB_BACKUP_FORMAT = 1;

async function cappbBuildBackup() {
  const data = await getData();
  return {
    app: CAPPB_BACKUP_APP,
    format: CAPPB_BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    groups: data.groups,
    notes: data.notes
  };
}

function cappbBackupFileName() {
  return "captain-pin-board-" + new Date().toISOString().slice(0, 10) + ".json";
}

// Reads backup text and returns clean { groups, notes }. Anything that is
// not a valid group or note is dropped instead of being trusted. Throws an
// Error with a readable message if the file is not a backup at all.
function cappbParseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error("This file is not valid JSON.");
  }
  if (!raw || raw.app !== CAPPB_BACKUP_APP || !Array.isArray(raw.groups) || !Array.isArray(raw.notes)) {
    throw new Error("This is not a Captain Pin Board backup file.");
  }
  if (raw.format > CAPPB_BACKUP_FORMAT) {
    throw new Error("This backup was made by a newer version. Please update the extension first.");
  }

  const isStr = (v) => typeof v === "string" && v.length > 0;
  const groups = raw.groups
    .filter((g) => g && isStr(g.id) && isStr(g.name))
    .map((g) => ({ id: g.id, name: g.name.trim().slice(0, 60) || "Untitled", color: isStr(g.color) ? g.color : CAPPB_PALETTE[0] }));

  const notes = [];
  raw.notes.forEach((n) => {
    if (!n || !isStr(n.id) || !isStr(n.groupId)) return;
    const isImage = n.type === "image";
    if (isImage && !(isStr(n.imageData) && n.imageData.startsWith("data:image/"))) return;
    if (!isImage && typeof n.text !== "string") return;

    const clean = {
      id: n.id,
      groupId: n.groupId,
      text: typeof n.text === "string" ? n.text : "",
      createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
      order: typeof n.order === "number" ? n.order : 0
    };
    if (isImage) {
      clean.type = "image";
      clean.imageData = n.imageData;
    }
    const tags = Array.isArray(n.tags) ? cappbParseTags(n.tags.join(" ")) : [];
    if (tags.length) clean.tags = tags;
    if (n.starred === true) clean.starred = true;
    notes.push(clean);
  });

  return { groups, notes };
}

// Adds what is missing and leaves everything you already have untouched.
// A note or collection counts as the same one when its id matches.
function cappbMergeBackup(current, incoming) {
  const groups = current.groups.slice();
  const notes = current.notes.slice();
  const groupIds = new Set(groups.map((g) => g.id));
  const noteIds = new Set(notes.map((n) => n.id));
  let addedGroups = 0;
  let addedNotes = 0;

  incoming.groups.forEach((g) => {
    if (!groupIds.has(g.id)) { groups.push(g); groupIds.add(g.id); addedGroups++; }
  });
  incoming.notes.forEach((n) => {
    if (noteIds.has(n.id)) return;
    // A note whose collection is missing goes into the first collection.
    notes.push(groupIds.has(n.groupId) ? n : { ...n, groupId: groups[0].id });
    noteIds.add(n.id);
    addedNotes++;
  });
  return { data: { groups, notes }, addedGroups, addedNotes };
}

// Replaces everything with the backup contents.
function cappbReplaceWithBackup(incoming) {
  const groups = incoming.groups.length ? incoming.groups : CAPPB_DEFAULTS.groups;
  const groupIds = new Set(groups.map((g) => g.id));
  const notes = incoming.notes.map((n) => (groupIds.has(n.groupId) ? n : { ...n, groupId: groups[0].id }));
  return { groups, notes };
}

// Unlike setData this reports a failed write, for example when the
// storage quota is exceeded by a very large backup.
function cappbSaveStrict(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}
