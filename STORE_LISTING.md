# Chrome Web Store listing, Captain Pin Board

Copy the fields below straight into the Developer Dashboard instead of writing them from scratch at submission time.

## Listing basics

- **Name**: Captain Pin Board
- **Category**: Productivity
- **Short description** (132 characters max):
  Pin messages into collections like Marketing or Scripts and find them again in one click.
- **Long description**:

  Captain Pin Board helps you save short text messages and screenshots into collections you create, so nothing important gets lost in a chat thread or a browser tab.

  Save any message in seconds. Highlight text on any page, open the popup, and pin it to a collection with one click, the message box fills in automatically from your selection. Prefer the right click menu? Select text, right click, choose "Pin to", and pick a collection, or create a new one on the spot. Already copied something from somewhere else? Use the Paste button, or the regular keyboard shortcut, to drop it straight into the message box.

  Capture anything you see on screen. Drag to select any part of a page, snipping tool style, and pin it as an image straight into a collection. Come back to it later, view it full size, or download it to your computer whenever you are ready.

  Keep everything organized by topic. Create as many collections as you need, for example Marketing, Scripts, or Client Replies. Each collection shows how many messages are inside it, so you always know what you have saved.

  Open the full board for a complete overview. A corkboard style page shows one column per collection, where you can rename topics, give each one its own color, search across every pinned message, and drag notes to reorder them or move them between collections, just like a personal Trello board that runs entirely on your own device.

  Manage every message or image with one click. View it in full, copy it to your clipboard, edit a message in place, download an image, or delete it with a quick confirmation, all from simple buttons on the note itself.

  Jump straight to what you need. Keyboard shortcuts open the full board or start a capture without opening the popup first, and can be customized any time.

  Your data stays yours. Everything is stored only on your own device using Chrome's built in storage. Nothing is uploaded to any server, and no data is collected, shared, or sold.

  Typical uses:

  Saving marketing copy, ad captions, or social media templates you reuse often
  Keeping YouTube video scripts, outlines, or talking points organized by project
  Collecting customer replies, support answers, or email templates for quick reuse
  Capturing screenshots of designs, error messages, or anything you want to revisit later
  Storing notes, quotes, or research snippets while browsing

  Captain Pin Board is lightweight, works offline, and asks for only the permissions it actually needs.

- **Single purpose statement**:
  Captain Pin Board lets a user save, organize, and retrieve short text snippets and screenshots into user created topic collections.

## Permission justifications

- **storage**: required to save the user's collections and pinned messages locally on the device.
- **unlimitedStorage**: required to store captured screenshot images locally, since image data is larger than the default storage quota allows.
- **contextMenus**: required for the right click "Pin to" menu on selected text.
- **activeTab**: required so the popup can read text the user has highlighted on the page they are currently viewing, and so the capture feature can draw a selection overlay, only at the moment the user invokes the extension.
- **scripting**: required together with activeTab to read the current text selection into the popup's message box, and to draw the on page selection overlay used for capturing an area; no other page content is read or modified.
- **clipboardRead**: required so the Paste button can read the clipboard and fill it into the message box when the user clicks it.

## Data use certification (Privacy practices tab)

- Does this extension collect or transmit user data: **No**.
- For each listed data category (personally identifiable information, health info, financial info, authentication info, personal communications, location, web history, user activity, website content): answer **not collected**.
- Certify: "I do not sell or transfer user data to third parties outside of the approved use cases" and "I do not use or transfer user data for purposes unrelated to my item's single purpose" and "I do not use or transfer user data to determine creditworthiness or for lending purposes".
- **Privacy policy URL**: paste the public URL where you have hosted `privacy-policy.html` from this project (see below).

## Hosting the privacy policy

`privacy-policy.html` in this project is ready to publish as is, once you fill in the two placeholders inside it (`REPLACE_WITH_DATE` and `REPLACE_WITH_SUPPORT_EMAIL`). It needs to live at a public URL before you can submit, for example:

- GitHub Pages (free): push it to a public repository and enable Pages.
- Notion, Google Sites, or Carrd (free): paste the same text into a new public page.
- Your own website, if you have one.

## Assets still to prepare

- **Screenshots**: at least one, 1280x800 or 640x400, showing the real popup or board in use. Load the unpacked extension, pin a couple of real looking messages, and take the screenshot from the actual browser rather than a mockup, since the Store reviews real UI.
- **Small promo tile** (440x280): optional but recommended, improves how the listing looks in search and category pages.
- **Marquee tile** (1400x560): optional, only used if Google features the extension.

## Account requirements (one time, on your Google account)

- Register at the Chrome Web Store Developer Dashboard and pay the one time 5 USD registration fee.
- Turn on 2-Step Verification on the Google account used to publish; Chrome Web Store will not allow publishing without it.
- Verify the contact email on the developer account, that is where review results and policy notices arrive.
- Fill in a publisher name (this is the "author" shown on the listing; the `author` key inside manifest.json is not read by Chrome, so it can stay as is or be removed).

## Final pre submission check

- [ ] Loaded the unpacked extension fresh and clicked through every feature with no console errors (check the service worker console from chrome://extensions).
- [ ] manifest.json has manifest_version 3 and a service_worker background (already true in this project).
- [ ] No remote scripts, fonts, or styles are loaded (already true, everything is bundled locally).
- [ ] Zip uploaded to the dashboard contains manifest.json at the top level, not inside an extra folder (zip this project's contents directly, as already done).
- [ ] Privacy policy is hosted and the URL is pasted into the dashboard.
- [ ] Permission justifications above are pasted into the matching dashboard fields.
- [ ] Screenshots are added.
- [ ] Distribution visibility set to Public (or Unlisted, if you want a private link only).
