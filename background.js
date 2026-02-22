let autoPagingState = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "autoPaging",
    title: "自動ページ送り",
    contexts: ["image"],
    documentUrlPatterns: ["http://solomon24.local:8096/*"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "autoPaging") return;

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
});

chrome.runtime.onMessage.addListener((message, sender) => {

  if (message.action === "autoPagingStopped") {

    autoPagingState = false;

    chrome.contextMenus.update("autoPaging", {
      title: "自動ページ送り"
    });

    console.log("Auto paging stopped at last page");
  }
});
