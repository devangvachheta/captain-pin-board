# Changelog

All notable changes to Captain Pin Board are recorded here, newest first.

## 1.2.0

**New features**
- Screenshot capture action bar: after you drag an area, the selection stays on screen with its size shown and a bar offers Pin, Copy, Download, and Cancel. Enter pins, Ctrl+C copies the image, Ctrl+S downloads a PNG, Esc cancels. Dragging again redraws the box. A collection list in the bar lets you pin to any collection without opening the board.
- Draw on a screenshot before saving it: Arrow, Box, Pen, and Text tools, five colors, and Undo (Ctrl+Z). Drawings are included when you Pin, Copy, or Download, and are painted onto the final image by the background service worker so they are exact at any screen scale.
- Quick find: press Alt+Shift+F anywhere to open a small search window. Type to filter your pins, move with the arrow keys, press Enter to copy the selected one (text or image), and the window closes. Esc closes it without copying.
- Tags: add tags to any note or image with the "+ tag" chip, remove them with the x. Separate several tags with commas or spaces.
- Tag filtering: the full board shows a tag bar, click a tag to filter every column. Search also understands tags, type #name to match tags only.
- Star: the star button on a note keeps it at the top of its collection, in both the popup and the full board, and ranks it first in Quick find.
- Export and Import: the Export button on the full board saves everything (collections, text and image pins, tags, stars) into one JSON backup file. Import restores from a backup file, Merge adds only what is missing and never creates duplicates, Replace all restores exactly the file after a confirmation. Files are checked before use: a file that is not a backup is rejected with a clear message and invalid entries inside a file are skipped.
- Built in Guide page: explains every keyboard shortcut, the right click "Pin to" menu step by step, screenshot capture and drawing, copying text and images, tags and stars, and backup. Open it with the new Help button in the popup or on the full board. The shortcut keys it shows are the ones currently assigned, so they stay correct if you customize them.

**Changed**
- Default keyboard shortcuts are now Alt+Shift+E (open the popup), Alt+Shift+C (capture an area), Alt+Shift+O (open the full board, was Alt+Shift+B), and Alt+Shift+F (quick find). Customizable at chrome://extensions/shortcuts.
- Screenshot capture no longer pins the moment you release the mouse. If you liked the old one step pin, press Enter right after dragging.

**Notes**
- No new permissions needed.
- Older notes keep working, they simply have no tags and no star.
- Chrome keeps shortcut keys you already have assigned when the extension updates, so existing users may still see Alt+Shift+B for the board. They can change it at chrome://extensions/shortcuts.

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
