// Shows the shortcut keys that are actually assigned right now, since the
// user can change them at chrome://extensions/shortcuts.
chrome.commands.getAll((commands) => {
  commands.forEach((cmd) => {
    const el = document.querySelector(`[data-command="${cmd.name}"]`);
    if (el) el.textContent = cmd.shortcut || "Not set";
  });
});

document.getElementById("shortcutsBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
