console.log("[Jellyfin Wheel] loaded");

let wheelAccum = 0;

const PAGE_THRESHOLD = 100; // 1ページ分のホイール量
const MAX_PAGES = 10;       // 進める最大ページ数
const CLICK_INTERVAL = 120; // ミリ秒

let autoPaging = false;
let autoPagingTimer = null;
const AUTO_INTERVAL = 7000; // 7秒（好みで変更）

// --------------------
// ページ送り
// --------------------
async function clickMultiple(button, count) {
  for (let i = 0; i < count; i++) {
    button.click();
    await new Promise(r => setTimeout(r, CLICK_INTERVAL));
  }
}

// --------------------
// Jellyfinページ判定
// --------------------
function isJellyfinPage() {
  const swiperContainer = document.querySelector(".slideshowSwiperContainer");
  const nextBtn = document.querySelector(".swiper-button-next");
  const prevBtn = document.querySelector(".swiper-button-prev");
  const zoomContainer = document.querySelector(".slider-zoom-container");

  // いずれか存在しなければ非対象
  if (!swiperContainer || !nextBtn || !prevBtn || !zoomContainer) {
    return false;
  }

  return true;
}

// --------------------
// ページ端チェック
// --------------------
function canGoNext() {
  const nextBtn = document.querySelector(".swiper-button-next");
  return nextBtn && nextBtn.getAttribute("aria-disabled") !== "true";
}

function canGoPrev() {
  const prevBtn = document.querySelector(".swiper-button-prev");
  return prevBtn && prevBtn.getAttribute("aria-disabled") !== "true";
}


// --------------------
// ホイールイベント
// --------------------
window.addEventListener(
  "wheel",
  async (e) => {
    if (!isJellyfinPage()) return;

    // 横スワイプ（ブラウザ戻る/進む）は無視
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }


    const nextBtn = document.querySelector(".swiper-button-next");
    const prevBtn = document.querySelector(".swiper-button-prev");
    if (!nextBtn || !prevBtn) return;

    // ページ端チェック
    if (e.deltaY > 0 && !canGoNext()) return;
    if (e.deltaY < 0 && !canGoPrev()) return;

    e.preventDefault();
    e.stopPropagation();

    // ホイール量を蓄積
    wheelAccum += e.deltaY;

    const pages = Math.trunc(wheelAccum / PAGE_THRESHOLD);
    if (pages === 0) return;

    // 上限
    const pageCount = Math.min(Math.abs(pages), MAX_PAGES);

    wheelAccum %= PAGE_THRESHOLD;

    if (pages > 0) {
      console.log(`[Jellyfin Wheel] next x${pageCount}`);
      await clickMultiple(nextBtn, pageCount);
    } else {
      console.log(`[Jellyfin Wheel] prev x${pageCount}`);
      await clickMultiple(prevBtn, pageCount);
    }
  },
  { passive: false }
);

// --------------------
// 読み方向 自動補正
// --------------------
let langDirFixed = false;

function autoFixReadingDirection() {
  if (langDirFixed) return;

  const btn = document.querySelector(".btnToggleLangDir");
  if (!btn) return;

  if (btn.getAttribute("title") === "Right To Left") {
    console.log("[Jellyfin Wheel] Auto toggle reading direction");
    btn.click();
  }

  langDirFixed = true;
}

// DOM変化を監視（SPA対策）
const observer = new MutationObserver(() => {
  if (!isJellyfinPage()) return;
  autoFixReadingDirection();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// ページの自動送り開始
function startAutoPaging() {
  if (autoPaging) return;

  const nextBtn = document.querySelector(".swiper-button-next");
  if (!nextBtn) return;

  autoPaging = true;

  autoPagingTimer = setInterval(() => {
    if (!canGoNext()) {
      stopAutoPaging();

      chrome.runtime.sendMessage({ action: "autoPagingStopped" });
      return;
    }

    nextBtn.click();
    console.log("[Jellyfin Wheel] auto next");
  }, AUTO_INTERVAL);

  console.log("[Jellyfin Wheel] Auto paging started");
}

// ページの自動送り停止
function stopAutoPaging() {
  if (!autoPaging) return;

  clearInterval(autoPagingTimer);
  autoPagingTimer = null;
  autoPaging = false;

  console.log("[Jellyfin Wheel] Auto paging stopped");
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "startAutoPaging") {
    startAutoPaging();
  }

  if (message.action === "stopAutoPaging") {
    stopAutoPaging();
  }

  if (message.action === "checkPageState") {

    const nextBtn = document.querySelector(".swiper-button-next");

    const isLastPage =
      !nextBtn ||
      nextBtn.classList.contains("swiper-button-disabled");

    sendResponse({ isLastPage });

    return true; // async対応
  }
    
});