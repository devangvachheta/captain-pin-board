importScripts("storage.js");

const CAPPB_ROOT_ID = "cappb-root";
const CAPPB_NEW_TOPIC_ID = "cappb-new-topic";

async function cappbRebuildMenu() {
  await chrome.contextMenus.removeAll();
  const data = await getData();

  chrome.contextMenus.create({
    id: CAPPB_ROOT_ID,
    title: 'Pin "%s" to…',
    contexts: ["selection"]
  });

  for (const group of data.groups) {
    chrome.contextMenus.create({
      id: `cappb-group-${group.id}`,
      parentId: CAPPB_ROOT_ID,
      title: group.name,
      contexts: ["selection"]
    });
  }

  chrome.contextMenus.create({
    id: CAPPB_NEW_TOPIC_ID,
    parentId: CAPPB_ROOT_ID,
    title: "＋ New topic…",
    contexts: ["selection"]
  });
}

chrome.runtime.onInstalled.addListener(cappbRebuildMenu);
chrome.runtime.onStartup.addListener(cappbRebuildMenu);

// Rebuild whenever groups change, for example when edited from the board page.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.groups) cappbRebuildMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = info.selectionText || "";
  if (!text) return;

  if (info.menuItemId === CAPPB_NEW_TOPIC_ID) {
    // Stash the pending text and open the board so the user can name the new topic.
    await chrome.storage.local.set({ pendingPin: text });
    chrome.tabs.create({ url: chrome.runtime.getURL("src/pages/board/board.html?newTopicFor=pending") });
    return;
  }

  if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("cappb-group-")) {
    const groupId = info.menuItemId.replace("cappb-group-", "");
    await addNote(groupId, text);

    chrome.action.setBadgeText({ text: "OK" });
    chrome.action.setBadgeBackgroundColor({ color: "#7c9473" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1200);
  }
});
