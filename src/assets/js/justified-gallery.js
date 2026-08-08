// Packs mixed-aspect-ratio photos into equal-height rows (a "justified"
// gallery, à la Flickr/500px) using the aspect ratio baked into each item's
// data-aspect-ratio attribute at build time -- no need to wait for images to
// load to know how to lay them out.
const TARGET_ROW_HEIGHT = 260;
const MAX_LAST_ROW_HEIGHT_RATIO = 1.8;
const GAP = 10;

function layout(container) {
  const items = Array.from(container.children);
  const containerWidth = container.clientWidth;
  if (!items.length || !containerWidth) return;

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
      // Don't blow up a short trailing row (e.g. the last 1-2 photos) to fill the width.
      rowHeight = Math.min(rowHeight, TARGET_ROW_HEIGHT * MAX_LAST_ROW_HEIGHT_RATIO);
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
