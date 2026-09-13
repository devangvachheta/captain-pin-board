# Chrome Web Store listing, Captain Pin Board

Copy the fields below straight into the Developer Dashboard instead of writing them from scratch at submission time.

## Listing basics

- **Name**: Captain Pin Board
- **Category**: Productivity
- **Short description** (132 characters max):
  Pin messages into collections like Marketing or Scripts and find them again in one click.
- **Long description**:

  Captain Pin Board helps you save short text messages into collections you create, so nothing important gets lost in a chat thread or a browser tab.

  Features:
  - Quick pin: select text on any page, open the popup, and save it to a collection in one click.
  - Right click to pin: highlight text, right click, choose Pin to, and pick a collection or create a new one on the spot.
  - Collections: group messages by topic, for example Marketing, Scripts, or Client Replies. Each collection shows how many messages are inside it.
  - Full board view: a corkboard style page with one column per collection, where you can rename, recolor, search, and move messages between collections.
  - Every message can be viewed in full, copied to the clipboard, edited in place, or deleted, all with a single click.
  - Everything is stored only on your own device. Nothing is uploaded anywhere.

- **Single purpose statement**:
  Captain Pin Board lets a user save, organize, and retrieve short text snippets into user created topic collections.

## Permission justifications

- **storage**: required to save the user's collections and pinned messages locally on the device.
- **contextMenus**: required for the right click "Pin to" menu on selected text.
- **activeTab**: required so the popup can read text the user has highlighted on the page they are currently viewing, only at the moment they open the popup.
- **scripting**: required together with activeTab to read the current text selection into the popup's message box; no other page content is read or modified.

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
