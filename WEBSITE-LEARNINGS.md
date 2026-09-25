# Building this site with Claude — a playbook for the next one

This document summarizes how `bart-van-dam-photography` was built, so the
same approach and lessons can be handed to a fresh Claude session as a
starting brief for a different website. It's written to be read by Claude,
not just by you — paste it into a new session as context.

## 1. Stack

- **Eleventy (11ty)** static site generator, **Nunjucks** templates, plain
  HTML/CSS output. No client-side framework — interactivity (lightbox, theme
  toggle, justified gallery) is small hand-written vanilla JS files.
- **`@11ty/eleventy-img` + `sharp`** for the image pipeline: responsive
  thumbnails (webp + jpeg, multiple widths) for the grid, and a separate
  full-size pipeline (resolution-capped, EXIF/GPS stripped) for the lightbox.
- No database, no CMS — **content lives in the filesystem** (see §2).
- Deploys as a static folder (`_site/`) to any static host / GitHub Pages via
  Actions.

**Why this stack**: for a portfolio/photo site with infrequent structural
changes but frequent content additions (new photos, new posts), a static
site generator with filesystem-as-CMS avoids needing a backend, admin UI, or
database, while still giving full design control (unlike a page-builder
SaaS). Eleventy specifically was chosen for minimal opinions/config over
Next.js/Astro-style frameworks — appropriate when there's no interactivity
budget beyond a few small scripts.

## 2. Content model: filesystem as CMS

- One folder per category under `photos/<category>/`, each becomes a gallery
  page at `/gallery/<folder-name>/` **automatically** — a new folder with
  images in it is a new category, no template edits needed.
- `src/_data/categories.js` is a **global Eleventy data file** that reads the
  filesystem synchronously at build time (`fs.readdirSync`, etc.) and returns
  structured JS objects the templates consume. This "read the filesystem as
  data" pattern is the core trick that makes the whole site content-driven —
  worth reaching for any time content is "a folder of similar things"
  (photos, case studies, portfolio pieces, products).
- Optional per-category `meta.json` (title, description, cover photo,
  ordering) and `captions.json` (per-file metadata) — **both optional**, with
  sensible fallbacks (folder name → title, first file → cover, filename →
  title-cased caption) so the site works with zero config and gets richer as
  you add JSON.
- `captions.json` schema evolved to support **two metadata sources merged
  with an override rule**: some fields (camera EXIF: focal length, aperture,
  shutter speed; or magnification/NA/illumination for microscopy) are parsed
  automatically out of a **structured filename convention** (see below);
  `captions.json` can override any of them explicitly per photo. Precedence:
  *explicit JSON value > filename-parsed value > omitted*. This is the single
  most reusable idea from this build: **push repetitive, derivable metadata
  into a naming convention parsed at build time, and reserve the manually-
  edited JSON file for what can't be derived** (titles, species, descriptions,
  over­rides for the rare exception).
  - Example filename convention actually used: exporting from Lightroom as
    `{Filename}_D{YYYYMMDD}_FL{FocalLength}_EX{Exposure}.jpg`, parsed with a
    regex in the data file into date/focal-length/aperture/shutter-speed.
    Sorting also switched from lexicographic filename sort to sorting by the
    *parsed* date, which is more robust than relying on a fixed prefix
    format.
  - This pattern generalizes: any time metadata is 1:1 with a fact already
    encoded somewhere upstream (EXIF, a spreadsheet, an export tool's naming
    options), consider parsing it at build time instead of hand-copying it
    into JSON for every item.

## 3. Design system

- CSS custom properties for a **light/dark theme**: base tokens on `:root`,
  overridden in a `html[data-theme="dark"]` block. A **separate set of
  "fixed" tokens** (not redefined per theme) for anything drawn on top of
  photos — captions, lightbox, watermark — since those need to stay legible
  regardless of the page's theme, on their own dark scrim.
- **Per-category accent colors**, wired once via a `data-slug` attribute
  selector (`.door[data-slug="x"] { --hl: var(--accent-x); }`) and then
  consumed everywhere that needs it (`var(--hl, var(--fallback))`) — homepage
  tiles, gallery hover captions, lightbox pills. One place to define an
  accent, many places it shows up consistently. Good pattern for any site
  with a handful of content categories that should each have a visual
  identity thread.
- **Three-font vocabulary**, used as a signal rather than just decoration: a
  serif for display/headings/brand name, a plain sans for body text, and an
  uppercase+letter-spaced mono for small "label-like" UI (nav links, tag
  pills, watermark) — so "looks like a mono uppercase pill" reliably means
  "this is a tag/label" across the whole site.
- Theme defaults to an **explicit choice** (dark) rather than deferring to
  `prefers-color-scheme`, stored in `localStorage` once the user picks.

## 4. Two hand-built pieces worth reusing wholesale

**Justified photo grid** (`src/assets/js/justified-gallery.js`, ~140 lines,
no dependency): packs mixed-aspect-ratio photos into full-width rows using
just each photo's aspect ratio (known at build time, no waiting for images to
load). Notable engineering details if you rebuild this:
- Row height floats freely to exactly fill the container width; a genuinely
  wide outlier (panorama) gets isolated into its own row so it doesn't wreck
  a whole row's height.
- A forced/leftover row (too few photos to reach full width) is capped at
  **the previous row's actual height**, not a flat constant — otherwise it
  reads as randomly bigger/smaller than the rows around it.
- Floating-point summation of per-photo widths can drift a hair past the
  container width, which is enough for `flex-wrap` to bump the last photo to
  a new line; fix is to make the *last item in a row* absorb the rounding
  remainder instead of using its own independently-computed width.

**Custom lightbox** (`src/assets/js/lightbox.js` + a Nunjucks partial): no
library, just `data-*` attributes on each gallery `<a>` read by a small JS
module. A subtlety worth remembering: give the caption area a **fixed
height** (not sized to content) so the image doesn't jump around when
navigating between photos with wildly different amounts of caption text —
long captions scroll internally instead.

## 5. Responsive edge cases actually hit (and their fixes)

These are the non-obvious bugs from this build — worth checking for
proactively next time rather than rediscovering them:

- **A phone turned sideways is wide *and* short.** A single `max-width`
  breakpoint can't distinguish "phone landscape" from "tablet" or "small
  desktop window" — combine `orientation: landscape` with a `max-height`
  (e.g. 500px) to reliably catch just the "phone sideways" case.
- **`:hover` sticks after a tap on touch devices** — a browser without true
  hover often applies `:hover` styles persistently after a tap (sometimes
  needing a second tap to actually follow a link). Any hover-revealed UI
  (captions, overlays) should also close on `:focus-visible` leaving, and
  avoid relying on `:focus-within` if the element programmatically re-focuses
  itself afterward (that retriggers it).
- **Native `<button>` keeps browser chrome** (gray background/border) unless
  explicitly reset — `background: none; border: none; appearance: none;` —
  easy to forget when a button is meant to look like a plain icon.
- **Scrollbar presence shifts centered layouts.** A page tall enough to need
  a vertical scrollbar has slightly less horizontal room than a short page
  without one, so `margin: 0 auto` centered content visibly shifts a few
  pixels between pages. Fix once, globally: `html { scrollbar-gutter: stable;
  overflow-y: scroll; }`.
- **CSS Grid `grid-template-areas` lets the same markup reflow completely**
  for a specific breakpoint (e.g. moving a caption from below an image to a
  sidebar beside it) without duplicating HTML for two layouts — assign areas
  in the default rule, redeclare `grid-template-areas`/`grid-template-columns`
  inside the media query.
- **A build-time cache keyed only by source-file identity (mtime+size) goes
  silently stale when the *processing code* changes**, not just the input —
  a watermark/thumbnail style tweak won't show up for already-cached files.
  Bake a version constant into the cache key and bump it whenever the
  processing logic changes.

## 6. How we worked (process, not just output)

- **Small, verifiable steps.** Nearly every CSS/JS/data change was followed
  immediately by `npm run build` and, where the result was a generated image
  or HTML output, actually reading it back (the `Read` tool renders images)
  to confirm the fix rather than assuming it worked from the code alone.
- **When something "looks wrong" but the code looks right on inspection,
  check the serving layer before re-guessing at the code** — stale dev-server
  state (especially after deleting/regenerating files a running dev server
  was watching), browser cache, or a leftover file from a previous build
  (Eleventy doesn't clean up output it no longer generates) are common
  culprits that look exactly like a code bug.
- **Document conventions in the README as you establish them** — filename
  conventions, JSON schemas, "how to add a category/post/photo" — so the
  site stays self-explanatory for future content additions without needing
  to re-derive the system from code each time.
- **Prefer additive, reversible changes**: new CSS variables/media queries
  scoped narrowly rather than rewriting shared rules, git-tracked renames
  instead of ad-hoc file moves, cache-clearing rather than hand-editing
  generated output.

## 7. A starter brief you could hand to a fresh Claude

> Build a static portfolio site with Eleventy + Nunjucks, no client
> framework. Content lives in the filesystem: one folder per
> category/section under `<content-dir>/`, each becomes a page automatically
> from a global Eleventy data file that reads the filesystem at build time.
> Support an optional per-folder `meta.json` (title/description/cover/order)
> and per-item `captions.json`/metadata file, both optional with sensible
> fallbacks. Use `@11ty/eleventy-img` + `sharp` for responsive images if
> there are photos involved. Build a light/dark theme with CSS custom
> properties, a small consistent accent-color system per category, and a
> three-font vocabulary (display/body/label). Favor small hand-written JS
> over libraries for interactivity. Iterate visually: after every visual
> change, rebuild and actually inspect the generated output before calling
> it done.

Adjust the specifics (content type, whether photos are involved, the exact
metadata fields) to the new site's actual subject matter — the structural
ideas above (filesystem-as-CMS, optional-with-fallbacks config, derive
metadata from naming conventions instead of hand-entry where possible) are
what's worth carrying over regardless of what the new site is about.
