# Captain Pin Board

A Chrome extension that lets you pin messages into collections such as Marketing, Scripts, or Personal, and find them again in one click.

## What it does

* Popup: quickly pin the text you selected on a page, or type a new message, choose a collection, and save.
* Collections list: open the popup to see every collection with a count of what is inside, tap one to open it.
* Inside a collection: view every pinned message, edit it in place, copy it, or delete it.
* Every pinned message has View, Copy, Edit, and Delete. Long messages scroll inside a fixed height instead of stretching the page, View expands them, Copy puts the text on your clipboard.
* Full board: click "Full board" in the popup for a corkboard view with one column per collection, recoloring, renaming, moving messages between collections, and search.
* Right click menu: select text on any page, right click, choose "Pin to" and pick a collection, or create a new one on the spot.

All data is stored locally on the device using chrome.storage.local. Nothing is sent to a server.

## Install for testing (Load unpacked)

1. Unzip this folder somewhere permanent, the extension is loaded from this folder, do not delete it after installing.
2. Open Chrome and go to chrome://extensions
3. Turn on Developer mode using the toggle in the top right.
4. Click Load unpacked and select this folder, the one containing manifest.json.
5. The Captain Pin Board icon appears in the toolbar, pin it for quick access.

## Project structure

The project is organized by role instead of one flat folder, so each piece is easy to find and reuse:

```
manifest.json              extension manifest (version 3)
icons/                      toolbar and store icons
src/
  services/
    storage.js              shared data layer over chrome.storage.local
    background.js           right click menu handling (the service worker)
  common/
    common.css              design tokens (colors, radius, shadow) and shared component classes, all prefixed with cappb
    common.js                shared UI helpers used by both pages (date formatting, inline edit, copy, expand)
  pages/
    popup/
      popup.html, popup.css, popup.js     the toolbar popup
    board/
      board.html, board.css, board.js     the full board page
```

Every color, border radius, and shadow used anywhere in the extension is defined once, at the top of `src/common/common.css`, as a CSS variable such as `--cappb-brick`, `--cappb-radius-lg`, or `--cappb-shadow-card`. Page specific files only reference these variables, so the whole look can be restyled by editing that one file.

## Before publishing to the Chrome Web Store

Checked against the current Chrome Web Store Developer Program Policies and Manifest V3 requirements:

* Manifest V3, single background service worker, no remote code, this project uses only local fonts and local scripts so it works fully offline.
* Permissions are limited to what is used: storage (save data), contextMenus (right click menu), scripting and activeTab (read selected text in the active tab from the popup). No host permissions are requested.
* Single, clear purpose: pinning and organizing short text snippets. Keep the store description focused on that so reviewers do not flag it as multi purpose.
* Icons are provided at 16, 48, and 128 pixels as required.
* No use of eval, inline scripts, or externally hosted code.
* Data handling: everything stays on the device, nothing is transmitted anywhere. State this clearly in the store listing's privacy practices section, and select "no data collected" where it applies.

Still needed from you before submission, since these are account level and not code level:

* Your developer or publisher name and support email, used on the Chrome Web Store listing and in the manifest's author field (currently a placeholder in manifest.json).
* A short and long store description, plus at least one screenshot (1280x800 or 640x400) and a small promo tile if you want one.
* A privacy policy link if you plan to publish under an organization account, some accounts require this even for extensions that store data locally only.
* Confirmation of the category to list under (likely Productivity) and the store listing language.

## Publishing to the Chrome Web Store

Two files in this project handle that:

* `STORE_LISTING.md`, ready to paste listing copy, permission justifications, and a submission checklist.
* `privacy-policy.html`, a ready to host privacy policy page, fill in the date and support email, then publish it at a public URL (GitHub Pages, Notion, or your own site) and paste that URL into the dashboard's Privacy tab.

See `STORE_LISTING.md` for the full list of what else is needed on the account side, such as the one time developer registration fee, 2-Step Verification, and screenshots.
