console.log("[Jellyfin Wheel] loaded");

let last = 0;

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
  (e) => {
    if (!isJellyfinPage()) return;

    const now = Date.now();
    if (now - last < 150) return; // 連打防止
    last = now;

    const nextBtn = document.querySelector(".swiper-button-next");
    const prevBtn = document.querySelector(".swiper-button-prev");
    if (!nextBtn || !prevBtn) return;

    // ページ端で無効化
    if (e.deltaY > 0 && !canGoNext()) return;
    if (e.deltaY < 0 && !canGoPrev()) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY > 0) {
      nextBtn.click();
      console.log("[Jellyfin Wheel] next click");
    } else {
      prevBtn.click();
      console.log("[Jellyfin Wheel] prev click");
    }
  },
  { passive: false }
);