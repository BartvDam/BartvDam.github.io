// Packs mixed-aspect-ratio photos into equal-height rows (a "justified"
// gallery, à la Flickr/500px) using the aspect ratio baked into each item's
// data-aspect-ratio attribute at build time -- no need to wait for images to
// load to know how to lay them out.
const TARGET_ROW_HEIGHT = 260;
const GAP = 10;
// Below this container width, drop row-packing entirely and stack photos in
// a single full-width column instead -- trying to fit 2+ narrow columns on a
// phone screen makes for awkward, cramped rows.
const MOBILE_BREAKPOINT = 700;

function layoutSingleColumn(items, containerWidth) {
  items.forEach((item) => {
    const ratio = parseFloat(item.dataset.aspectRatio || "1.5");
    item.style.width = `${containerWidth}px`;
    item.style.height = `${containerWidth / ratio}px`;
  });
}

function layoutJustified(items, containerWidth) {
  let row = [];
  let ratioSum = 0;

  const flush = (rowItems, isLastRow) => {
    if (!rowItems.length) return;
    const totalGap = GAP * (rowItems.length - 1);
    const rowRatioSum = rowItems.reduce(
      (sum, item) => sum + parseFloat(item.dataset.aspectRatio || "1.5"),
      0
    );
    let rowHeight = (containerWidth - totalGap) / rowRatioSum;

    if (isLastRow) {
      // Don't stretch a short trailing row (e.g. a single leftover photo) to
      // fill the width -- keep it at the same height as the other rows
      // instead, left-aligned with empty space after it.
      rowHeight = Math.min(rowHeight, TARGET_ROW_HEIGHT);
    }

    rowItems.forEach((item) => {
      const ratio = parseFloat(item.dataset.aspectRatio || "1.5");
      item.style.height = `${rowHeight}px`;
      item.style.width = `${rowHeight * ratio}px`;
    });
  };

  items.forEach((item) => {
    const ratio = parseFloat(item.dataset.aspectRatio || "1.5");
    row.push(item);
    ratioSum += ratio;

    const widthAtTargetHeight = TARGET_ROW_HEIGHT * ratioSum + GAP * (row.length - 1);
    if (widthAtTargetHeight >= containerWidth) {
      flush(row, false);
      row = [];
      ratioSum = 0;
    }
  });

  flush(row, true);
}

function layout(container) {
  const items = Array.from(container.children);
  const containerWidth = container.clientWidth;
  if (!items.length || !containerWidth) return;

  if (containerWidth < MOBILE_BREAKPOINT) {
    layoutSingleColumn(items, containerWidth);
  } else {
    layoutJustified(items, containerWidth);
  }
}

function init() {
  document.querySelectorAll(".justified-gallery").forEach((container) => {
    let resizeTimer;
    const run = () => layout(container);
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(run, 80);
    });
    observer.observe(container);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
