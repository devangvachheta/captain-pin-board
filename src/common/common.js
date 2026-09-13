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

// Wires a "Copy" button to copy the given text and briefly confirm it worked.
function cappbAttachCopy(copyBtn, getText) {
  const originalLabel = copyBtn.textContent;
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getText());
      copyBtn.textContent = "Copied";
    } catch (e) {
      copyBtn.textContent = "Could not copy";
    }
    setTimeout(() => (copyBtn.textContent = originalLabel), 1200);
  });
}

// Wires a "View" button to expand a message past its normal max height,
// and collapse it back to a scrollable card on a second click.
function cappbAttachExpand(viewBtn, textEl) {
  viewBtn.addEventListener("click", () => {
    const expanded = textEl.classList.toggle("cappb-pin-text--expanded");
    viewBtn.textContent = expanded ? "Collapse" : "View";
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
