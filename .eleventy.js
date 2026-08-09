const path = require("path");
const { DateTime } = require("luxon");
const { getThumb, getFull } = require("./src/_11ty/images.js");

module.exports = function (eleventyConfig) {
  // Static assets
  eleventyConfig.addPassthroughCopy({ "src/assets/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/images": "images" });

  eleventyConfig.addWatchTarget("photos/");
  eleventyConfig.addWatchTarget("src/assets/");

  // Builds the inline --hl-light/--hl-dark custom properties from a
  // category's accent colors, resolved to the active theme by CSS.
  function accentStyle(category) {
    if (!category.accentLight) return "";
    let style = `--hl-light:${category.accentLight};`;
    if (category.accentDark) style += `--hl-dark:${category.accentDark};`;
    return style;
  }

  // Renders one gallery photo: responsive thumbnail markup + a plain link to
  // the capped/watermarked full-size version, which lightbox.js intercepts.
  // On hover: an inset rectangle with colorful corner accents (via --hl,
  // resolved per-theme from the category's accent) plus an overlay with the
  // title and an optional line of small metadata (focal length, magnification,
  // whatever fits the category).
  eleventyConfig.addAsyncShortcode("galleryItem", async function (photo) {
    const [thumb, full] = await Promise.all([getThumb(photo.absPath, photo.title), getFull(photo.absPath)]);
    const title = photo.title.replace(/"/g, "&quot;");

    const captionLines = [`<span class="cap-title">${photo.title}</span>`];
    if (photo.meta && photo.meta.length) {
      const metaText = photo.meta.join(" · ").replace(/"/g, "&quot;");
      captionLines.push(`<span class="cap-meta">${metaText}</span>`);
    }

    return `<a class="gallery-item" href="${full.jpegUrl}"
        data-aspect-ratio="${thumb.aspectRatio.toFixed(4)}" data-title="${title}">
      <div class="ph">
        <div class="photo-inner">
          ${thumb.html}
          <span class="gallery-item-caption">${captionLines.join("")}</span>
        </div>
        <div class="hover-box">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
        </div>
      </div>
    </a>`;
  });

  // Renders a homepage "door" -- a hover-expanding panel linking to one
  // category's gallery, with its cover photo as a CSS background image (not
  // an <img>, since it's a background panel rather than sized content).
  eleventyConfig.addAsyncShortcode("categoryDoor", async function (category) {
    const cover = await getThumb(category.cover, category.title);
    const count = category.photos.length;

    return `<a class="door" href="/gallery/${category.slug}/"
        style="background-image:url('${cover.url}');${accentStyle(category)}">
      <span class="tag">
        <b>${category.title}</b>
        <small>${count} image${count === 1 ? "" : "s"}</small>
      </span>
    </a>`;
  });

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("d LLLL yyyy");
  });

  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
  });

  eleventyConfig.addCollection("postsByDate", (collectionApi) => {
    return collectionApi.getFilteredByTag("post").sort((a, b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    templateFormats: ["njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
