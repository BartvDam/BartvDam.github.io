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

    const filenames = fs
      .readdirSync(folderPath)
      .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort();

    const photos = filenames.map((filename) => ({
      absPath: path.join(folderPath, filename),
      filename,
      title: captions[filename] || titleFromFilename(filename),
    }));

    const coverFilename = meta.cover && filenames.includes(meta.cover) ? meta.cover : filenames[0];

    return {
      slug,
      title: meta.title || titleFromFilename(slug),
      description: meta.description || "",
      order: typeof meta.order === "number" ? meta.order : 999,
      cover: coverFilename ? path.join(folderPath, coverFilename) : null,
      photos,
    };
  });

  categories.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return categories;
};
