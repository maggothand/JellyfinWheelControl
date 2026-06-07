(function () {

  console.log("[Jellyfin Wheel] loaded");

  if (window.jellyfinWheelLoaded) return;
  window.jellyfinWheelLoaded = true;

  /* -----------------------------
    設定
  ----------------------------- */

  const PAGE_THRESHOLD = 100;
  const MAX_PAGES = 10;
  const CLICK_INTERVAL = 120;
  const AUTO_INTERVAL = 10000;

  /* -----------------------------
    状態
  ----------------------------- */

  let wheelAccum = 0;

  let autoPaging = false;
  let autoPagingTimer = null;

  let countdownOverlay = null;
  let countdownTimer = null;
  let countdownRemaining = 0;

  let langDirFixed = false;

  /* -----------------------------
    Jellyfin判定
  ----------------------------- */

  function isJellyfinPage() {

    const swiper = document.querySelector(".slideshowSwiperContainer");
    const next = document.querySelector(".swiper-button-next");
    const prev = document.querySelector(".swiper-button-prev");
    const zoom = document.querySelector(".slider-zoom-container");

    return swiper && next && prev && zoom;
  }

  function canGoNext() {
    const btn = document.querySelector(".swiper-button-next");
    return btn && btn.getAttribute("aria-disabled") !== "true";
  }

  function canGoPrev() {
    const btn = document.querySelector(".swiper-button-prev");
    return btn && btn.getAttribute("aria-disabled") !== "true";
  }

  /* -----------------------------
    ページ送り
  ----------------------------- */

  async function clickMultiple(button, count) {

    for (let i = 0; i < count; i++) {

      button.click();

      await new Promise(r => setTimeout(r, CLICK_INTERVAL));
    }
  }

  /* -----------------------------
    ホイールページ送り
  ----------------------------- */

  window.addEventListener("wheel", async (e) => {

    if (!isJellyfinPage()) return;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    const nextBtn = document.querySelector(".swiper-button-next");
    const prevBtn = document.querySelector(".swiper-button-prev");

    if (!nextBtn || !prevBtn) return;

    if (e.deltaY > 0 && !canGoNext()) return;
    if (e.deltaY < 0 && !canGoPrev()) return;

    e.preventDefault();
    e.stopPropagation();

    wheelAccum += e.deltaY;

    const pages = Math.trunc(wheelAccum / PAGE_THRESHOLD);
    if (pages === 0) return;

    const pageCount = Math.min(Math.abs(pages), MAX_PAGES);

    wheelAccum %= PAGE_THRESHOLD;

    if (pages > 0) {

      console.log(`[Jellyfin Wheel] next x${pageCount}`);
      await clickMultiple(nextBtn, pageCount);

    } else {

      console.log(`[Jellyfin Wheel] prev x${pageCount}`);
      await clickMultiple(prevBtn, pageCount);

    }

  }, { passive: false });

  /* -----------------------------
    読み方向補正
  ----------------------------- */

  function autoFixReadingDirection() {

    if (langDirFixed) return;

    const btn = document.querySelector(".btnToggleLangDir");
    if (!btn) return;

    if (btn.getAttribute("title") !== "Right To Left") return;

    console.log("[Jellyfin Wheel] Auto toggle reading direction");

    btn.click();

    langDirFixed = true;
  }

  /* -----------------------------
    カウントダウンUI
  ----------------------------- */

  function createCountdownOverlay() {

    let existing = document.getElementById("jellyfinAutoPagingCountdown");
    if (existing) {
      countdownOverlay = existing;
      return;
    }

    countdownOverlay = document.createElement("div");
    countdownOverlay.id = "jellyfinAutoPagingCountdown";

    countdownOverlay.style.position = "fixed";
    countdownOverlay.style.bottom = "20px";
    countdownOverlay.style.right = "20px";
    countdownOverlay.style.zIndex = "2147483647";
    countdownOverlay.style.pointerEvents = "none";

    countdownOverlay.innerHTML = `
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="26"
        stroke="rgba(255,255,255,0.2)"
        stroke-width="4" fill="none"/>
      <circle id="jellyfinCountdownRing"
        cx="30" cy="30" r="26"
        stroke="white"
        stroke-width="4"
        fill="none"
        stroke-linecap="round"
        transform="rotate(-90 30 30)"
        stroke-dasharray="163"
        stroke-dashoffset="0"/>
      <text id="jellyfinCountdownText"
        x="30" y="36"
        text-anchor="middle"
        font-size="18"
        fill="white"
        font-family="monospace">10</text>
    </svg>
    `;

    document.body.appendChild(countdownOverlay);
  }

  function updateCountdown() {

    if (!countdownOverlay || !document.body.contains(countdownOverlay)) {
      createCountdownOverlay();
    }

    const text = document.getElementById("jellyfinCountdownText");
    const ring = document.getElementById("jellyfinCountdownRing");

    if (!text || !ring) return;

    text.textContent = countdownRemaining;

    const total = AUTO_INTERVAL / 1000;
    const progress = countdownRemaining / total;

    ring.style.strokeDashoffset = 163 * (1 - progress);
  }

  function removeCountdown() {

    if (countdownOverlay) {
      countdownOverlay.remove();
      countdownOverlay = null;
    }

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  /* -----------------------------
    自動ページ送り
  ----------------------------- */

  function startAutoPaging() {

    if (autoPaging) return;

    const nextBtn = document.querySelector(".swiper-button-next");
    if (!nextBtn) return;

    autoPaging = true;

    createCountdownOverlay();

    countdownRemaining = AUTO_INTERVAL / 1000;
    updateCountdown();

    countdownTimer = setInterval(() => {

      countdownRemaining--;
      updateCountdown();

      if (countdownRemaining <= 0) {
        countdownRemaining = AUTO_INTERVAL / 1000;
      }

    }, 1000);

    autoPagingTimer = setInterval(() => {

      if (!canGoNext()) {

        stopAutoPaging();

        chrome.runtime.sendMessage({ action: "autoPagingStopped" });

        return;
      }

      nextBtn.click();

      countdownRemaining = AUTO_INTERVAL / 1000;

      console.log("[Jellyfin Wheel] auto next");

    }, AUTO_INTERVAL);

    console.log("[Jellyfin Wheel] Auto paging started");
  }

  function stopAutoPaging() {

    if (!autoPaging) return;

    clearInterval(autoPagingTimer);
    autoPagingTimer = null;

    autoPaging = false;

    removeCountdown();

    console.log("[Jellyfin Wheel] Auto paging stopped");
  }

  /* -----------------------------
    SPA監視
  ----------------------------- */

  const observer = new MutationObserver(() => {

    if (!isJellyfinPage()) {

      langDirFixed = false;

      if (autoPaging) {

        stopAutoPaging();

        chrome.runtime.sendMessage({ action: "autoPagingStopped" });
      }

      return;
    }

    autoFixReadingDirection();

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  /* -----------------------------
    background通信
  ----------------------------- */

  chrome.runtime.onMessage.addListener((message) => {

    if (message.action === "startAutoPaging") startAutoPaging();

    if (message.action === "stopAutoPaging") stopAutoPaging();

    if (message.action === "moveVolume") moveVolume(message.direction);

  });

  let actionbuttonTitle = null;

  document.addEventListener("mousedown", (e) => {

    // カード中央の再生ボタン
    let playBtn = e.target.closest(".cardOverlayButton");

    if (playBtn) {
      console.log("[Jellyfin Wheel] カード中央の［再生］");

      const item = playBtn.closest(".card, .item");
      const el = item?.querySelector(".itemAction.textActionButton");

      actionbuttonTitle = el?.title || null;
      return;
    }

    // 詳細：レジューム or 再生
    playBtn = e.target.closest(
      ".button-flat.btnPlay.detailButton.emby-button, " +
      ".button-flat.btnReplay.detailButton.emby-button"
    );

    if (playBtn) {
      console.log("[Jellyfin Wheel] 詳細画面の再生系");

      const container = playBtn.closest(".detailRibbon");
      const item = container?.querySelector(".itemName.infoText.parentNameLast");

      actionbuttonTitle = item?.textContent || null;
      return;
    }

  });

  /* -----------------------------
    Move Volume
  ----------------------------- */
  function moveVolume(direction) {
    let targetTitle = "";

    //再生やレジュームボタンがクリックされた時のタイトルがある場合は、それを優先
    if(actionbuttonTitle == null) {
      const visiblePages = [...document.querySelectorAll(".page")]
        .filter(p => p.offsetParent !== null);
      const currentPage = visiblePages[visiblePages.length - 1];
      let itemName = currentPage?.querySelector(".itemName.infoText.parentNameLast");
      if (!itemName) {
        itemName = document.querySelector(".itemName.infoText.parentNameLast");
      }

      if (!itemName) {
        console.log("[Jellyfin Wheel] itemName not found");
        return;
      }
      targetTitle = itemName.textContent;
    }
    else {
      targetTitle = actionbuttonTitle;
    }

    var searchTitle;
    if(direction === "previous") {
      searchTitle = updateVolume(targetTitle, -1); // 前巻
    }
    else if(direction === "next") {
      searchTitle = updateVolume(targetTitle, +1); // 次巻
    }

    if (!searchTitle)
    {
      alert("このタイトルには巻数情報が見つかりませんでした。");
      return;
    }

    console.log("[Jellyfin Wheel] moveVolume searchTitle:", searchTitle);

    chrome.runtime.sendMessage({ action: "searchBook", text: searchTitle });

  }

  function updateVolume(text, direction) {
    const match = text.match(/第\s*(\d+)\s*巻/);

    if (!match) return null;

    const current = parseInt(match[1], 10);
    const next = current + direction;

    // 0巻とか負数防止
    if (next <= 0) return null;

    return text.replace(match[0], `第${next}巻`);
  }

  /* -----------------------------
    Home scroller hover
  ----------------------------- */

  let hoveredScroller = null;

  document.addEventListener("mouseover", (e) => {

    // カード上のみ対象
    const trigger = e.target.closest(".cardScalable, .cardText");

    if (!trigger) {
      hoveredScroller = null;
      return;
    }

    // if (!cardText) {
    //   hoveredScroller = null;
    //   return;
    // }


    // 親scroller取得
    const scroller = e.target.closest(".emby-scroller");

    if (scroller) {
      hoveredScroller = scroller;
      console.log("[Jellyfin Wheel] hovered card");
    }

  });

  document.addEventListener("mouseout", (e) => {

    const trigger = e.target.closest(".cardScalable, .cardText");

    if (!trigger) return;

    const scroller = e.target.closest(".emby-scroller");
    // console.log("[Jellyfin Wheel] mouseout", scroller);

    if (scroller && hoveredScroller === scroller) {
      hoveredScroller = null;
    }

  });


  /* -----------------------------
   Home scroller wheel support
  ----------------------------- */

  window.addEventListener("wheel", (e) => {

    // slideshow中は除外
    if (isJellyfinPage()) return;

    if (!hoveredScroller) return;

    const container =
      hoveredScroller.closest(".emby-scroller-container");

    if (!container) return;

    const buttons =
      container.querySelectorAll(".emby-scrollbuttons button");

    if (buttons.length < 2) return;

    const prevBtn = buttons[0];
    const nextBtn = buttons[1];

    // 横ジェスチャーは無視
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY > 0) {

      nextBtn.click();
      // console.log("[Jellyfin Wheel] home scroll next");

    } else {

      prevBtn.click();
      // console.log("[Jellyfin Wheel] home scroll prev");

    }

  }, { passive: false });



})();