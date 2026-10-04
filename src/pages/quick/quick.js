// Quick find: a small window opened by Alt+Shift+F. Type to filter your
// pins, move with the arrow keys, press Enter to copy the selected one.

const quickInput = document.getElementById("quickInput");
const quickResults = document.getElementById("quickResults");
const quickTags = document.getElementById("quickTags");
const quickToast = document.getElementById("quickToast");

const QUICK_MAX_RESULTS = 50;

let quickData = { groups: [], notes: [] };
let quickList = [];   // notes currently shown, in display order
let quickIndex = 0;   // which row is highlighted
let quickBusy = false;

// Starred first, then newest first, which is what you usually want back.
function quickCompare(a, b) {
  return (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || b.createdAt - a.createdAt;
}

function quickRenderTagChips() {
  quickTags.innerHTML = "";
  cappbCollectTags(quickData.notes).slice(0, 8).forEach(({ tag }) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "cappb-quick-tag";
    chip.textContent = "#" + tag;
    chip.addEventListener("click", () => {
      quickInput.value = "#" + tag;
      quickInput.focus();
      quickRender();
    });
    quickTags.appendChild(chip);
  });
}

function quickRender() {
  quickList = quickData.notes
    .filter((n) => cappbNoteMatches(n, quickInput.value))
    .sort(quickCompare)
    .slice(0, QUICK_MAX_RESULTS);
  if (quickIndex >= quickList.length) quickIndex = Math.max(0, quickList.length - 1);

  quickResults.innerHTML = "";
  if (quickList.length === 0) {
    const li = document.createElement("li");
    li.className = "cappb-empty-hint";
    li.textContent = quickData.notes.length === 0 ? "Nothing pinned yet." : "No matches.";
    quickResults.appendChild(li);
    return;
  }

  quickList.forEach((note, i) => {
    const group = quickData.groups.find((g) => g.id === note.groupId);
    const li = document.createElement("li");
    li.className = "cappb-quick-row" + (i === quickIndex ? " cappb-quick-row--active" : "");
    if (group) li.style.borderLeftColor = group.color;

    const main = document.createElement("div");
    main.className = "cappb-quick-main";
    if (note.type === "image") {
      const img = document.createElement("img");
      img.className = "cappb-quick-thumb";
      img.src = note.imageData;
      main.appendChild(img);
    } else {
      const p = document.createElement("p");
      p.className = "cappb-quick-text";
      p.textContent = note.text;
      main.appendChild(p);
    }

    const meta = document.createElement("div");
    meta.className = "cappb-quick-meta";
    const g = document.createElement("span");
    g.className = "cappb-quick-group";
    g.textContent = group ? group.name : "";
    meta.appendChild(g);
    (note.tags || []).forEach((t) => {
      const s = document.createElement("span");
      s.textContent = "#" + t;
      meta.appendChild(s);
    });
    main.appendChild(meta);
    li.appendChild(main);

    if (note.starred) {
      const star = document.createElement("span");
      star.className = "cappb-quick-star";
      star.textContent = "★";
      li.appendChild(star);
    }

    li.addEventListener("click", () => quickCopy(note));
    li.addEventListener("mousemove", () => {
      if (quickIndex !== i) { quickIndex = i; quickHighlight(); }
    });
    quickResults.appendChild(li);
  });
}

function quickHighlight() {
  [...quickResults.children].forEach((el, i) => {
    el.classList.toggle("cappb-quick-row--active", i === quickIndex);
    if (i === quickIndex) el.scrollIntoView({ block: "nearest" });
  });
}

function quickShowToast(text, isError) {
  quickToast.textContent = text;
  quickToast.classList.toggle("cappb-quick-toast--error", !!isError);
}

async function quickCopy(note) {
  if (quickBusy) return;
  quickBusy = true;
  try {
    if (note.type === "image") {
      const blob = await (await fetch(note.imageData)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } else {
      await navigator.clipboard.writeText(note.text);
    }
    quickShowToast("Copied");
    setTimeout(() => window.close(), 350);
  } catch (e) {
    quickShowToast("Could not copy", true);
    quickBusy = false;
  }
}

quickInput.addEventListener("input", () => {
  quickIndex = 0;
  quickRender();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.close();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (quickList.length) { quickIndex = (quickIndex + 1) % quickList.length; quickHighlight(); }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (quickList.length) { quickIndex = (quickIndex - 1 + quickList.length) % quickList.length; quickHighlight(); }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (quickList[quickIndex]) quickCopy(quickList[quickIndex]);
  }
});

(async function init() {
  quickData = await getData();
  quickRenderTagChips();
  quickRender();
  quickInput.focus();
})();
