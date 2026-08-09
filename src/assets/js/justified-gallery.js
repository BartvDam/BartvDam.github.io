// Packs mixed-aspect-ratio photos into equal-height rows (a "justified"
// gallery, à la Flickr/500px) using the aspect ratio baked into each item's
// data-aspect-ratio attribute at build time -- no need to wait for images to
// load to know how to lay them out.
const TARGET_ROW_HEIGHT = 260;
// Keep every row's height within this band around the target, even if an
// outlier aspect ratio (a panorama, an extreme portrait) is in it -- a
// consistent rhythm across rows reads as calmer than a strictly edge-to-edge
// fill that lets one photo swing a row's height wildly. When a row is
// clamped it simply doesn't reach the far edge, matching how the last row
// (a genuinely partial row) already behaves.
const MIN_ROW_HEIGHT_RATIO = 0.75;
const MAX_ROW_HEIGHT_RATIO = 1.35;
// A photo this wide (relative to the container, at target height) gets its
// own row instead of being grouped with others -- mixing a panorama into a
// row of normal photos drags that whole row's height down well outside the
// calm band above. On its own it just renders as a shorter, wide strip,
// which is the expected look for a panorama in a justified gallery.
const OUTLIER_WIDTH_RATIO = 0.6;
const GAP = 14; // must match --gap in style.css
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
    const exactFitHeight = (containerWidth - totalGap) / rowRatioSum;

    const minHeight = TARGET_ROW_HEIGHT * MIN_ROW_HEIGHT_RATIO;
    const maxHeight = isLastRow ? TARGET_ROW_HEIGHT : TARGET_ROW_HEIGHT * MAX_ROW_HEIGHT_RATIO;
    let rowHeight = Math.min(Math.max(exactFitHeight, minHeight), maxHeight);

    // Raising a too-short row up to minHeight assumes there's slack to do so
    // without overflowing -- not true for a single extreme-wide outlier (a
    // panorama can already exceed the container width well below minHeight).
    // Fall back to the exact fit rather than let the row spill sideways.
    if (rowHeight * rowRatioSum + totalGap > containerWidth) {
      rowHeight = exactFitHeight;
    }

    rowItems.forEach((item) => {
      const ratio = parseFloat(item.dataset.aspectRatio || "1.5");
      item.style.height = `${rowHeight}px`;
      item.style.width = `${rowHeight * ratio}px`;
    });
  };

  items.forEach((item) => {
    const ratio = parseFloat(item.dataset.aspectRatio || "1.5");
    const soloWidth = TARGET_ROW_HEIGHT * ratio;
    const isOutlier = soloWidth >= containerWidth * OUTLIER_WIDTH_RATIO;

    if (isOutlier && row.length > 0) {
      flush(row, false);
      row = [];
      ratioSum = 0;
    }

    row.push(item);
    ratioSum += ratio;

    const widthAtTargetHeight = TARGET_ROW_HEIGHT * ratioSum + GAP * (row.length - 1);
    if (isOutlier || widthAtTargetHeight >= containerWidth) {
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
