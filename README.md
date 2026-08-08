# Bart van Dam — Photography

Static site built with [Eleventy](https://www.11ty.dev/). Plain HTML/CSS output,
no client-side framework — just a build step that turns photos, markdown posts
and a couple of templates into the final site.

## Getting started

```
npm install
npm run dev      # local dev server with live reload, http://localhost:8080
npm run build    # production build into _site/
```

Requires Node.js (LTS).

## Adding photos

Drop image files (`.jpg`, `.jpeg` or `.png`) into `photos/<category>/`. That's
it — the next build picks them up automatically:

- One page per subfolder of `photos/` is generated at `/gallery/<folder-name>/`,
  and a tile for it appears on the homepage.
- Each photo is automatically resized into multiple responsive sizes, converted
  to WebP, and laid out in an equal-row-height "justified" gallery that adapts
  to phone/tablet/desktop widths.
- The full-size version shown in the lightbox is capped at 2000px on the long
  edge, has its EXIF/GPS data stripped, and gets a subtle watermark — so what's
  publicly downloadable is never your original file. See "Image protection"
  below to adjust or disable this.
- Photo captions default to a title-cased version of the filename (so
  `2026-03-01-grey-heron.jpg` → "Grey Heron"). To set a leading date so photos
  sort chronologically, prefix the filename with `YYYY-MM-DD-`.
- To set custom captions instead of relying on the filename, add a
  `captions.json` file inside the category folder:
  ```json
  { "2026-03-01-grey-heron.jpg": "Grey heron, early morning light" }
  ```

### Adding or editing a category

Add a `meta.json` file inside the category folder to control its title,
description, homepage tile image, and ordering:

```json
{
  "title": "Wildlife",
  "description": "Birds and other wildlife photographed in the field.",
  "cover": "2026-03-01-grey-heron.jpg",
  "order": 2
}
```

All fields are optional — without a `meta.json`, the folder name is used as
the title, the first photo (alphabetically) becomes the cover, and categories
are ordered alphabetically.

A brand new category is just a new folder under `photos/` with at least one
image in it — no template or HTML editing required.

## Adding blog posts

Create a markdown file anywhere under `src/posts/`:

```markdown
---
title: My new post
date: 2026-05-01
description: One-line summary shown on the blog index (optional).
---

Post body in regular markdown.
```

It shows up at `/blog/<filename-without-extension>/` and is listed on `/blog/`
automatically, newest first.

## Image protection

Nothing served over the web can be made truly impossible to copy — screenshots
and dev tools always work. What this site does instead, at zero extra cost:

- Never publishes full-resolution originals (capped to 2000px long edge).
- Strips EXIF/GPS metadata from published images.
- Stamps a small semi-transparent watermark onto the full-size (lightbox)
  version — see `src/_11ty/images.js` (`WATERMARK_TEXT`, `MAX_FULL_EDGE`) to
  change the text or resolution cap, or remove the watermark step entirely by
  editing `getWatermarkedSource`.

## Editing content

- **About page**: `src/about.njk` — replace the placeholder bio text and swap
  `src/assets/images/about-portrait.jpg` for a real photo.
- **Site name/nav/social links**: `src/_data/site.js`.
- **Theme (colors, fonts, spacing)**: `src/assets/css/style.css`.
- **Justified gallery row height / gap**: constants at the top of
  `src/assets/js/justified-gallery.js`.

## Deploying

The build output is the static `_site/` folder — deploy it to any static
host. Cloudflare Pages or Netlify both work well: point them at this repo with
build command `npm run build` and output directory `_site`.

## Placeholder content

This repo ships with a few solid-color placeholder photos (in `photos/`) and
a placeholder about-page portrait so you can see the layout working
end-to-end. Delete them and drop in real photos whenever you're ready — the
build doesn't need them to work, they're just there to demonstrate the
justified gallery with mixed aspect ratios.
