const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const Image = require("@11ty/eleventy-img");

const PROJECT_ROOT = path.join(__dirname, "..", "..");
const WATERMARK_CACHE_DIR = path.join(PROJECT_ROOT, ".cache", "watermarked");
const MAX_FULL_EDGE = 2000; // never publish full-resolution originals
const WATERMARK_TEXT = "© Bart van Dam";

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildWatermarkSvg(width, height) {
  const fontSize = Math.max(16, Math.round(width * 0.022));
  const margin = Math.round(fontSize * 0.9);
  const strokeWidth = Math.max(1, Math.round(fontSize * 0.08));
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .wm {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: ${fontSize}px;
        fill: rgba(255,255,255,0.55);
        paint-order: stroke;
        stroke: rgba(0,0,0,0.35);
        stroke-width: ${strokeWidth};
      }
    </style>
    <text x="${width - margin}" y="${height - margin}" text-anchor="end" class="wm">${escapeXml(WATERMARK_TEXT)}</text>
  </svg>`;
}

// Resizes to a web-safe max resolution, strips EXIF/GPS (sharp drops metadata
// unless .withMetadata() is called) and stamps a subtle watermark, then caches
// the result on disk keyed by the source file's mtime+size so repeat builds
// don't reprocess unchanged photos.
async function getWatermarkedSource(srcPath) {
  fs.mkdirSync(WATERMARK_CACHE_DIR, { recursive: true });
  const stat = fs.statSync(srcPath);
  const cacheKey = `${path.basename(srcPath, path.extname(srcPath))}-${stat.mtimeMs}-${stat.size}.jpg`;
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
  const resizedMeta = await sharp(resizedBuffer).metadata();
  const watermarkSvg = buildWatermarkSvg(resizedMeta.width, resizedMeta.height);

  await sharp(resizedBuffer)
    .composite([{ input: Buffer.from(watermarkSvg) }])
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
