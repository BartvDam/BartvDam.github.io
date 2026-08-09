const fs = require("fs");
const path = require("path");

const PHOTOS_DIR = path.join(__dirname, "..", "..", "photos");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

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

module.exports = function () {
  if (!fs.existsSync(PHOTOS_DIR)) {
    return [];
  }

  const categoryFolders = fs
    .readdirSync(PHOTOS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  const categories = categoryFolders.map((entry) => {
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

    // captions.json entries can be a plain string (just a title) or an object
    // { title, meta: [...] } -- meta is an ordered list of small overlay
    // strings (focal length, aperture, magnification, whatever fits the
    // category) shown on hover, joined with " · ".
    const photos = filenames.map((filename) => {
      const raw = captions[filename];
      const isRich = raw && typeof raw === "object";
      return {
        absPath: path.join(folderPath, filename),
        filename,
        title: (isRich ? raw.title : raw) || titleFromFilename(filename),
        meta: (isRich && Array.isArray(raw.meta)) ? raw.meta : [],
      };
    });

    const coverFilename = meta.cover && filenames.includes(meta.cover) ? meta.cover : filenames[0];

    // accent can be a single hex string (same in both themes) or
    // { light, dark } for a theme-appropriate pair.
    let accentLight = null;
    let accentDark = null;
    if (typeof meta.accent === "string") {
      accentLight = meta.accent;
    } else if (meta.accent && typeof meta.accent === "object") {
      accentLight = meta.accent.light || null;
      accentDark = meta.accent.dark || null;
    }

    return {
      slug,
      title: meta.title || titleFromFilename(slug),
      description: meta.description || "",
      accentLight,
      accentDark,
      order: typeof meta.order === "number" ? meta.order : 999,
      cover: coverFilename ? path.join(folderPath, coverFilename) : null,
      photos,
    };
  });

  categories.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return categories;
};
