const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PHOTOS_DIR = path.join(__dirname, "..", "..", "photos");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
// Keep in sync with NARROW_RATIO in src/assets/js/justified-gallery.js --
// this is what decides which photos get paired up below.
const PORTRAIT_RATIO_THRESHOLD = 0.95;

function titleFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  // Strip an optional leading date prefix, e.g. "2026-01-05-diatom.jpg"
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const spaced = withoutDate.replace(/[-_]+/g, " ").trim();
  return spaced.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function readJsonIfExists(filePath, fallback) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  return fallback;
}

async function getAspectRatio(absPath) {
  const meta = await sharp(absPath).rotate().metadata();
  return meta.width / meta.height;
}

// Reorders photos so portrait-ish photos end up adjacent to each other --
// the justified gallery packs portraits into dedicated rows, which only
// looks good if there are 2+ of them together rather than one isolated
// portrait surrounded by landscapes. Landscape order is left untouched;
// a portrait is only ever pulled forward to sit next to the next portrait
// that comes along (a lone trailing portrait, if the count is odd, is left
// to render on its own -- the layout still handles that gracefully).
function groupPortraits(items) {
  const result = [];
  let pending = null;
  for (const item of items) {
    if (item.aspectRatio < PORTRAIT_RATIO_THRESHOLD) {
      if (pending) {
        result.push(pending, item);
        pending = null;
      } else {
        pending = item;
      }
    } else {
      result.push(item);
    }
  }
  if (pending) result.push(pending);
  return result;
}

module.exports = async function () {
  if (!fs.existsSync(PHOTOS_DIR)) {
    return [];
  }

  const categoryFolders = fs
    .readdirSync(PHOTOS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  const categories = await Promise.all(
    categoryFolders.map(async (entry) => {
      const slug = entry.name;
      const folderPath = path.join(PHOTOS_DIR, slug);
      const meta = readJsonIfExists(path.join(folderPath, "meta.json"), {});
      const captions = readJsonIfExists(path.join(folderPath, "captions.json"), {});

      // Newest first -- relies on filenames being date-prefixed (see README).
      const filenames = fs
        .readdirSync(folderPath)
        .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
        .sort()
        .reverse();

      // captions.json entries can be a plain string (just a title) or an
      // object { title, meta: [...], nl, en, latin, description }. meta is
      // an ordered list of small overlay strings (focal length, aperture,
      // magnification, whatever fits the category) shown on hover, joined
      // with " · ". The rest are optional and only used in the lightbox:
      // nl/en become the "Dutch name · English name" heading, latin is
      // shown in italic below it, and description below that.
      const photosWithRatio = await Promise.all(
        filenames.map(async (filename) => {
          const raw = captions[filename];
          const isRich = raw && typeof raw === "object";
          const absPath = path.join(folderPath, filename);
          return {
            aspectRatio: await getAspectRatio(absPath),
            photo: {
              absPath,
              filename,
              title: (isRich ? raw.title : raw) || titleFromFilename(filename),
              meta: (isRich && Array.isArray(raw.meta)) ? raw.meta : [],
              nl: (isRich && raw.nl) || null,
              en: (isRich && raw.en) || null,
              latin: (isRich && raw.latin) || null,
              description: (isRich && raw.description) || null,
            },
          };
        })
      );

      const photos = groupPortraits(photosWithRatio).map((entry) => entry.photo);

      const coverFilename = meta.cover && filenames.includes(meta.cover) ? meta.cover : filenames[0];

      return {
        slug,
        title: meta.title || titleFromFilename(slug),
        description: meta.description || "",
        order: typeof meta.order === "number" ? meta.order : 999,
        cover: coverFilename ? path.join(folderPath, coverFilename) : null,
        photos,
      };
    })
  );

  categories.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return categories;
};
