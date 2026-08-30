const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const Image = require("@11ty/eleventy-img");

const PROJECT_ROOT = path.join(__dirname, "..", "..");
const WATERMARK_CACHE_DIR = path.join(PROJECT_ROOT, ".cache", "watermarked");
const MAX_FULL_EDGE = 2000; // never publish full-resolution originals
const WATERMARK_TEXT = "Bart van Dam · Photography";
// Bump whenever buildWatermarkSvg changes, so cached watermarked files (keyed
// below by source mtime+size) get regenerated even when the source photo
// itself hasn't -- otherwise a style tweak silently only applies to new photos.
const WATERMARK_VERSION = 10;

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Uppercase, letter-spaced mono wordmark (the same treatment as ".brand-tag"
// -- the small "PHOTOGRAPHY" label next to the site name in the header --
// now applied to the whole watermark, not just half of it), centered at the
// bottom with a thin rule flanking each side. Faded rather than bright: a
// low-opacity fill and a soft, low-opacity outline let it sit quietly *in*
// the photo instead of jumping off of it, while the outline still keeps it
// from disappearing entirely against similarly light/dark backgrounds.
function buildWatermarkSvg(width, height) {
  const fontSize = Math.max(14, Math.round(width * 0.017));
  const letterSpacing = Math.round(fontSize * 0.15);
  const margin = Math.round(fontSize * 1.8);
  const displayText = escapeXml(WATERMARK_TEXT.toUpperCase());

  // No text-measurement available at this stage, so estimate the rendered
  // width from the mono font's fairly uniform glyph width -- close enough
  // to place the flanking rules with a consistent, even gap.
  const estimatedTextWidth =
    WATERMARK_TEXT.length * fontSize * 0.6 + (WATERMARK_TEXT.length - 1) * letterSpacing;

  const centerX = width / 2;
  const textY = height - margin;
  const lineY = textY - fontSize * 0.32;
  const gap = fontSize * 0.9;
  const lineLength = Math.min(width * 0.1, fontSize * 4);
  const leftLineEnd = centerX - estimatedTextWidth / 2 - gap;
  const rightLineStart = centerX + estimatedTextWidth / 2 + gap;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .wm {
        font-family: 'Courier New', ui-monospace, monospace;
        font-size: ${fontSize}px;
        letter-spacing: ${letterSpacing}px;
        fill: rgba(255,255,255,0.4);
        paint-order: stroke;
        stroke: rgba(0,0,0,0.3);
        stroke-width: ${Math.max(1, Math.round(fontSize * 0.06))};
      }
      .wm-line {
        stroke: rgba(255,255,255,0.35);
        stroke-width: 1;
      }
    </style>
    <line class="wm-line" x1="${leftLineEnd - lineLength}" y1="${lineY}" x2="${leftLineEnd}" y2="${lineY}" />
    <line class="wm-line" x1="${rightLineStart}" y1="${lineY}" x2="${rightLineStart + lineLength}" y2="${lineY}" />
    <text x="${centerX}" y="${textY}" text-anchor="middle" class="wm">${displayText}</text>
  </svg>`;
}

// Resizes to a web-safe max resolution, strips EXIF/GPS (sharp drops metadata
// unless .withMetadata() is called) and stamps a subtle watermark, then caches
// the result on disk keyed by the source file's mtime+size (and the watermark
// style version) so repeat builds don't reprocess unchanged photos.
async function getWatermarkedSource(srcPath) {
  fs.mkdirSync(WATERMARK_CACHE_DIR, { recursive: true });
  const stat = fs.statSync(srcPath);
  const cacheKey = `${path.basename(srcPath, path.extname(srcPath))}-${stat.mtimeMs}-${stat.size}-v${WATERMARK_VERSION}.jpg`;
  const cachedPath = path.join(WATERMARK_CACHE_DIR, cacheKey);

  if (fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  const meta = await sharp(srcPath).rotate().metadata();
  const longEdge = Math.max(meta.width, meta.height);

  let pipeline = sharp(srcPath).rotate();
  if (longEdge > MAX_FULL_EDGE) {
    pipeline = pipeline.resize(
      meta.width >= meta.height ? { width: MAX_FULL_EDGE } : { height: MAX_FULL_EDGE }
    );
  }
  const resizedBuffer = await pipeline.toBuffer();

  // Watermark disabled for now -- see buildWatermarkSvg above for the last
  // design in progress. Re-enable by restoring the composite() call below.
  // const resizedMeta = await sharp(resizedBuffer).metadata();
  // const watermarkSvg = buildWatermarkSvg(resizedMeta.width, resizedMeta.height);
  await sharp(resizedBuffer)
    // .composite([{ input: Buffer.from(watermarkSvg) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(cachedPath);

  return cachedPath;
}

function safeBase(srcPath) {
  return path.basename(srcPath, path.extname(srcPath)).replace(/[^a-z0-9-_]/gi, "-");
}

// Small responsive image for the justified gallery grid. Not watermarked
// (too small to matter) so it stays cheap to generate and lightweight to ship.
async function getThumb(srcPath, alt) {
  const metadata = await Image(srcPath, {
    widths: [400, 800],
    formats: ["webp", "jpeg"],
    outputDir: "./_site/img/thumb/",
    urlPath: "/img/thumb/",
    filenameFormat: (id, src, width, format) => `${safeBase(src)}-${width}w-${id}.${format}`,
  });

  const largestJpeg = metadata.jpeg[metadata.jpeg.length - 1];

  const html = Image.generateHTML(metadata, {
    alt,
    loading: "lazy",
    decoding: "async",
    sizes: "(max-width: 700px) 100vw, 33vw",
    class: "gallery-thumb",
  });

  return {
    html,
    url: largestJpeg.url,
    aspectRatio: largestJpeg.width / largestJpeg.height,
    width: largestJpeg.width,
    height: largestJpeg.height,
  };
}

// Full-size image used by the lightbox: capped resolution, EXIF-stripped,
// watermarked -- the version a visitor could actually save.
async function getFull(srcPath) {
  const watermarkedPath = await getWatermarkedSource(srcPath);

  const metadata = await Image(watermarkedPath, {
    widths: [null],
    formats: ["webp", "jpeg"],
    outputDir: "./_site/img/full/",
    urlPath: "/img/full/",
    filenameFormat: (id, src, width, format) => `${safeBase(srcPath)}-full-${id}.${format}`,
  });

  const jpeg = metadata.jpeg[0];
  const webp = metadata.webp[0];

  return {
    jpegUrl: jpeg.url,
    webpUrl: webp.url,
    width: jpeg.width,
    height: jpeg.height,
  };
}

module.exports = { getThumb, getFull };
