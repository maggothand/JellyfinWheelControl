let autoPagingState = false;
let connectUrl = "http://solomon24.local:8096/";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "autoPaging",
    title: "自動ページ送り",
    contexts: ["image"],
    documentUrlPatterns: [connectUrl + "*"]
  });

  chrome.contextMenus.create({
    id: "moveVolume",
    title: "巻を移動",
    contexts: ["image"]
  });

  chrome.contextMenus.create({
    parentId: "moveVolume",
    id: "movePreviousVolume",
    title: "前巻を表示",
    contexts: ["image"]
  });

  chrome.contextMenus.create({
    parentId: "moveVolume",
    id: "moveNextVolume",
    title: "次巻を表示",
    contexts: ["image"]
  });

  // 選択したテキストをJellyfinで検索するコンテキストメニュー
  chrome.contextMenus.create({
    id: "searchBookTitle",
    title: "Jellyfin で「%s」を検索",
    contexts: ['selection']
  });  
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case "autoPaging":

      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "checkPageState"
        });

        if (response?.isLastPage) {
          console.log("Already at last page.");
          return;
        }

      } catch (err) {
        console.warn("State check failed:", err);
        return;
      }

      autoPagingState = !autoPagingState;

      await chrome.tabs.sendMessage(tab.id, {
        action: autoPagingState ? "startAutoPaging" : "stopAutoPaging"
      });

      chrome.contextMenus.update("autoPaging", {
        title: autoPagingState
          ? "自動ページ送り停止"
          : "自動ページ送り"
      });

      break;

    case "movePreviousVolume":
      // chrome.tabs.reload(tab.id);
      await chrome.tabs.sendMessage(tab.id, {
        action: "moveVolume",
        direction: "previous"
      });
      break;

    case "moveNextVolume":
      // chrome.tabs.reload(tab.id);
      await chrome.tabs.sendMessage(tab.id, {
        action: "moveVolume",
        direction: "next"
      });
      break;

    case "searchBookTitle":
      const query = info.selectionText.trim();
      const searchUrl = connectUrl + `web/#/search?query=${encodeURIComponent(query)}`;
      chrome.tabs.update(tab.id, { url: searchUrl });
      break;


    }
});

chrome.runtime.onMessage.addListener((message, sender) => {

  if (message.action === "autoPagingStopped") {

    autoPagingState = false;

    chrome.contextMenus.update("autoPaging", {
      title: "自動ページ送り"
    });

    console.log("Auto paging stopped at last page");
  }

  if (message.action === "searchBook") {
    console.log("Received searchBook message:", message);

    const { text } = message;
    const searchUrl = connectUrl + `web/#/search?query=${encodeURIComponent(text)}`;
    chrome.tabs.update(sender.tab.id, { url: searchUrl });
  }

});
