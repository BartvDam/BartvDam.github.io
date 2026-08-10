// Packs mixed-aspect-ratio photos into equal-height rows (a "justified"
// gallery, à la Flickr/500px) using the aspect ratio baked into each item's
// data-aspect-ratio attribute at build time -- no need to wait for images to
// load to know how to lay them out.
//
// Every row's height floats freely to whatever value makes it fill the
// container width exactly (portraits included -- a row containing one just
// ends up a bit taller or shorter than the target, whatever the math needs).
// The one exception is a genuinely wide outlier (a panorama): mixing one
// into a row of normal photos drags that whole row's height down a lot, so
// it gets isolated into its own row instead. Isolating it means the row(s)
// immediately around it may get cut short before reaching the width
// threshold naturally -- those forced/leftover rows are capped at the
// target height rather than stretched, since a forced flush of very few
// photos can otherwise compute an absurd height (e.g. one photo alone
// stretched to fill the full row width).
const TARGET_ROW_HEIGHT = 260;
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

function ratioOf(item) {
  return parseFloat(item.dataset.aspectRatio || "1.5");
}

function layoutJustified(items, containerWidth) {
  let row = [];
  let ratioSum = 0;

  const flush = (rowItems, capAtTarget) => {
    if (!rowItems.length) return;
    const totalGap = GAP * (rowItems.length - 1);
    const rowRatioSum = rowItems.reduce((sum, item) => sum + ratioOf(item), 0);
    let rowHeight = (containerWidth - totalGap) / rowRatioSum;
    if (capAtTarget) {
      rowHeight = Math.min(rowHeight, TARGET_ROW_HEIGHT);
    }

    rowItems.forEach((item) => {
      const ratio = ratioOf(item);
      item.style.height = `${rowHeight}px`;
      item.style.width = `${rowHeight * ratio}px`;
    });
  };

  items.forEach((item) => {
    const ratio = ratioOf(item);
    const soloWidth = TARGET_ROW_HEIGHT * ratio;
    const isOutlier = soloWidth >= containerWidth * OUTLIER_WIDTH_RATIO;

    if (isOutlier && row.length > 0) {
      flush(row, true); // forced pre-flush ahead of an outlier -- cap it
      row = [];
      ratioSum = 0;
    }

    row.push(item);
    ratioSum += ratio;

    const widthAtTargetHeight = TARGET_ROW_HEIGHT * ratioSum + GAP * (row.length - 1);
    if (isOutlier) {
      flush(row, true); // the outlier's own row -- cap too (rarely engages)
      row = [];
      ratioSum = 0;
    } else if (widthAtTargetHeight >= containerWidth) {
      flush(row, false); // reached full width naturally -- let it float freely
      row = [];
      ratioSum = 0;
    }
  });

  flush(row, true); // true last row -- cap so a small leftover doesn't blow up
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
