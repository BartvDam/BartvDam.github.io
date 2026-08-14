const fs = require("fs");
const path = require("path");

const PHOTOS_DIR = path.join(__dirname, "..", "..", "photos");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function titleFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  // An EXIF-in-filename export (see parseExifFromFilename /
  // parseMicroExifFromFilename) has no human-readable content to fall back
  // to -- just the camera's own ID / the shot's own ID.
  const marked =
    base.match(/^(.*)_D\d{8}_FL[\d.]+\s*mm_EX/i) || base.match(/^(.*)_D\d{8}-M[\d.]+X_ILL/i);
  if (marked) {
    return marked[1] || "Untitled";
  }
  // Strip an optional leading date prefix, e.g. "2026-01-05-diatom.jpg"
  const withoutDate = base.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const spaced = withoutDate.replace(/[-_]+/g, " ").trim();
  return spaced.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

// Parses EXIF values out of a Lightroom filename export using the template
// "{Filename}_D{Date YYYYMMDD}_FL{Focal Length}_EX{Exposure}" (see README).
// Photos not exported with that template just get all-null fields here, and
// rely entirely on captions.json.
function parseExifFromFilename(filename) {
  const empty = { date: null, focalLength: null, shutterSpeed: null, aperture: null };
  const base = path.basename(filename, path.extname(filename)).replace(/,/g, ".");
  const match = base.match(/_D(\d{8})_FL([\d.]+)\s*mm_EX(.+)$/i);
  if (!match) return empty;

  const [, ymd, focal, exposure] = match;
  const date = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)));
  const focalLength = `${focal}mm`;

  // Exposure renders as e.g. "1-2000 sec at f - 6.3" (Lightroom's combined
  // "Exposure" token -- "/" replaced with "-" for filesystem safety).
  let shutterSpeed = null;
  let aperture = null;
  const exposureMatch = exposure.match(/^(\d+)(?:-(\d+))?\s*sec\s+at\s+f\s*-\s*([\d.]+)/i);
  if (exposureMatch) {
    const [, numerator, denominator, fNumber] = exposureMatch;
    shutterSpeed = denominator ? `${numerator}/${denominator}s` : `${numerator}s`;
    aperture = `f/${fNumber}`;
  }

  return { date, focalLength, shutterSpeed, aperture };
}

// Parses magnification/NA/illumination out of a microscopy filename using
// the template "{Filename}_D{Date YYYYMMDD}-M{Magnification}X_ILL{Illumination}
// [_NA{Numerical Aperture}]" (NA is optional -- not every setup reports it).
function parseMicroExifFromFilename(filename) {
  const empty = { date: null, magnification: null, na: null, illumination: null };
  const base = path.basename(filename, path.extname(filename)).replace(/,/g, ".");
  const match = base.match(/_D(\d{8})-M([\d.]+)X_ILL([A-Za-z]+)(?:_NA([\d.]+))?/i);
  if (!match) return empty;

  const [, ymd, magnification, illumination, na] = match;
  const date = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)));

  return {
    date,
    magnification: `${magnification}×`,
    illumination,
    na: na ? `NA ${na}` : null,
  };
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
      .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));

    // captions.json entries can be a plain string (just a title) or an
    // object { title, meta: [...], location, nl, en, latin, description,
    // focalLength, aperture, shutterSpeed, magnification, na, illumination }.
    // focalLength/aperture/shutterSpeed default to whatever
    // parseExifFromFilename can read out of a Lightroom EXIF-in-filename
    // export, and magnification/na/illumination default to whatever
    // parseMicroExifFromFilename can read out of a microscopy filename --
    // either way an explicit captions.json value overrides the parsed one,
    // so most photos need no captions.json entry at all for those fields.
    // meta is an ordered list of extra technical spec strings that aren't
    // derived from the filename, and gets appended after the derived ones.
    // The combined list is shown as pills in the lightbox and joined with
    // " · " for the grid's hover overlay (location gets appended there too,
    // since that overlay only has room for one line). The rest are optional
    // and only used in the lightbox: en/nl/latin build the title line,
    // location gets a pin icon, description is the blurb underneath.
    const photos = filenames.map((filename) => {
      const raw = captions[filename];
      const isRich = raw && typeof raw === "object";
      const exif = parseExifFromFilename(filename);
      const micro = parseMicroExifFromFilename(filename);

      const focalLength = (isRich && raw.focalLength) || exif.focalLength || null;
      const aperture = (isRich && raw.aperture) || exif.aperture || null;
      const shutterSpeed = (isRich && raw.shutterSpeed) || exif.shutterSpeed || null;
      const magnification = (isRich && raw.magnification) || micro.magnification || null;
      const na = (isRich && raw.na) || micro.na || null;
      const illumination = (isRich && raw.illumination) || micro.illumination || null;
      const extraMeta = (isRich && Array.isArray(raw.meta)) ? raw.meta : [];

      return {
        absPath: path.join(folderPath, filename),
        filename,
        date: exif.date || micro.date,
        title: (isRich ? raw.title : raw) || titleFromFilename(filename),
        meta: [focalLength, aperture, shutterSpeed, magnification, na, illumination]
          .filter(Boolean)
          .concat(extraMeta),
        location: (isRich && raw.location) || null,
        nl: (isRich && raw.nl) || null,
        en: (isRich && raw.en) || null,
        latin: (isRich && raw.latin) || null,
        description: (isRich && raw.description) || null,
      };
    });

    // Newest first. Photos exported with the EXIF-in-filename convention
    // sort by that parsed date; photos without it (no captions.json date
    // either) fall back to filename order, which still works out to
    // chronological as long as the older YYYY-MM-DD- prefix convention is
    // kept for those.
    photos.sort((a, b) => {
      if (a.date && b.date) return b.date - a.date;
      if (a.date || b.date) return a.date ? -1 : 1;
      return b.filename.localeCompare(a.filename);
    });

    const coverFilename = meta.cover && photos.some((p) => p.filename === meta.cover)
      ? meta.cover
      : (photos[0] && photos[0].filename);

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
