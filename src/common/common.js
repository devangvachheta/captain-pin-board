// Shared UI helpers reused by both the popup and the full board page.

function cappbFormatDate(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function cappbPlaceCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// Wires a "Download" button to save an image note as a PNG file on
// disk, using a plain anchor tag so no extra permission is needed.
function cappbAttachDownload(downloadBtn, getDataUrl) {
  downloadBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = getDataUrl();
    a.download = `captain-pin-board-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

// Wires a "Copy" button to copy text, or an image when kind is "image",
// and briefly confirms it worked.
function cappbAttachCopy(copyBtn, getContent, kind) {
  const originalLabel = copyBtn.textContent;
  copyBtn.addEventListener("click", async () => {
    try {
      if (kind === "image") {
        const blob = await (await fetch(getContent())).blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(getContent());
      }
      copyBtn.textContent = "Copied";
    } catch (e) {
      copyBtn.textContent = "Could not copy";
    }
    setTimeout(() => (copyBtn.textContent = originalLabel), 1200);
  });
}

// Shows the full text of a note in a centered modal, so a very long
// message never has to grow inside its card and break the surrounding
// layout. Closes on the X button, clicking the backdrop, or Escape.
function cappbShowTextModal(text) {
  const textEl = document.createElement("p");
  textEl.className = "cappb-modal-text";
  textEl.textContent = text;
  cappbOpenModal(textEl);
}

// Shows a captured image at full size in the same modal shell.
function cappbShowImageModal(dataUrl) {
  const img = document.createElement("img");
  img.className = "cappb-modal-image";
  img.src = dataUrl;
  cappbOpenModal(img);
}

function cappbOpenModal(contentEl) {
  const backdrop = document.createElement("div");
  backdrop.className = "cappb-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "cappb-modal";

  const closeBtn = document.createElement("button");
  closeBtn.className = "cappb-btn cappb-btn--icon cappb-modal-close";
  closeBtn.textContent = "Close";

  modal.appendChild(closeBtn);
  modal.appendChild(contentEl);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function close() {
    backdrop.remove();
    document.removeEventListener("keydown", onKeydown);
  }
  function onKeydown(e) {
    if (e.key === "Escape") close();
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener("keydown", onKeydown);
}

// Wires a "View" button to open the full message (or image, when kind
// is "image") in a modal, reading current content through getContent.
function cappbAttachView(viewBtn, getContent, kind) {
  viewBtn.addEventListener("click", () => {
    if (kind === "image") cappbShowImageModal(getContent());
    else cappbShowTextModal(getContent());
  });
}

// Wires an inline "click to edit" flow onto a contenteditable text element,
// shared by the popup item list and the full board sticky notes.
function cappbAttachInlineEdit(textEl, editBtn, originalText, onSave) {
  const commit = async () => {
    textEl.setAttribute("contenteditable", "false");
    editBtn.textContent = "Edit";
    const newText = textEl.textContent.trim();
    if (newText && newText !== originalText) {
      await onSave(newText);
    } else {
      textEl.textContent = originalText;
    }
  };

  editBtn.addEventListener("click", () => {
    const editing = textEl.getAttribute("contenteditable") === "true";
    if (!editing) {
      textEl.setAttribute("contenteditable", "true");
      textEl.focus();
      cappbPlaceCaretAtEnd(textEl);
      editBtn.textContent = "Save";
    } else {
      commit();
    }
  });

  textEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  });

  textEl.addEventListener("blur", () => {
    if (textEl.getAttribute("contenteditable") === "true") commit();
  });
}

// Wires the star button on a note card. A starred note stays at the top
// of its collection. onChange re-renders the surrounding list.
function cappbAttachStar(starBtn, note, onChange) {
  starBtn.textContent = note.starred ? "★" : "☆";
  starBtn.classList.toggle("cappb-star-btn--on", !!note.starred);
  starBtn.title = note.starred ? "Remove star" : "Star: keep at the top";
  starBtn.addEventListener("click", async () => {
    await toggleStar(note.id);
    await onChange();
  });
}

// Renders the tag chips for a note into container, plus a "+ tag" button
// that turns into a small input. Options:
//   onChange()      called after tags are saved, to re-render
//   onTagClick(tag) optional, makes the chips clickable (used for filtering)
function cappbAttachTags(container, note, options) {
  const tags = note.tags || [];
  container.innerHTML = "";

  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "cappb-tag";

    const label = document.createElement("span");
    label.className = "cappb-tag-label";
    label.textContent = "#" + tag;
    if (options.onTagClick) {
      label.classList.add("cappb-tag-label--link");
      label.title = "Show notes tagged #" + tag;
      label.addEventListener("click", () => options.onTagClick(tag));
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cappb-tag-remove";
    remove.textContent = "×";
    remove.title = "Remove tag";
    remove.addEventListener("click", async () => {
      await setNoteTags(note.id, tags.filter((t) => t !== tag));
      await options.onChange();
    });

    chip.appendChild(label);
    chip.appendChild(remove);
    container.appendChild(chip);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "cappb-tag-add";
  addBtn.textContent = "+ tag";
  addBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "cappb-tag-input";
    input.placeholder = "tag, tag…";
    addBtn.replaceWith(input);

    // A draggable card would start a drag instead of selecting text in the input.
    const card = container.closest("[draggable]");
    if (card) card.draggable = false;
    input.focus();

    let done = false;
    const finish = async (save) => {
      if (done) return;
      done = true;
      if (card) card.draggable = true;
      const added = save ? cappbParseTags(input.value) : [];
      if (added.length) {
        await setNoteTags(note.id, [...tags, ...added]);
        await options.onChange();
      } else {
        input.replaceWith(addBtn);
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); finish(true); }
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
  });
  container.appendChild(addBtn);
}
