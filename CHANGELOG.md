# Changelog

All notable changes to Captain Pin Board are recorded here, newest first.

## 1.1.0

**New features**
- Capture area to pin: drag to select any part of a page, snipping tool style, and pin it as an image straight into a collection.
- Every pinned image supports View (full size), Copy (to clipboard), and Download (saves a PNG file), alongside the existing Delete.
- A Paste button in the message box fills it from the clipboard in one click.
- Keyboard shortcuts: Alt+Shift+B opens the full board directly, Alt+Shift+C starts an area capture, both without opening the popup first. Customizable at chrome://extensions/shortcuts.
- Drag and drop on the full board: reorder notes within a collection, or drag a note into a different column to move it.

**Improvements**
- Viewing a long message now opens a modal instead of expanding the card, so long text never breaks the board or popup layout.
- Deleting a message or image now asks for confirmation first.
- Redesigned the message box: a bold "MESSAGE or note" label, the Paste button, Capture moved inside the box as a bottom bar, a custom dropdown arrow on the collection picker, and a bold "YOUR COLLECTIONS" heading with a count and a cleaner arrow icon.
- The status message under the Pin button no longer reserves blank space when there is nothing to show.

**New permissions**
- `unlimitedStorage`: needed to store captured screenshot images, which are larger than the default storage quota.
- `clipboardRead`: needed for the Paste button to read the clipboard.

**Fixes**
- Fixed the capture button doing nothing in some cases due to a tab id not being passed correctly in the background script.
- Fixed captured text sometimes showing through the Capture bar when the message box was scrolled.

## 1.0.0
- Initial release: pin messages into collections, right click to pin, the full corkboard board view, and per note Edit, Copy, and Delete.
