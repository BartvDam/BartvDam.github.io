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

  // Renders one gallery photo: responsive thumbnail markup + a plain link to
  // the capped/watermarked full-size version, which lightbox.js intercepts.
  eleventyConfig.addAsyncShortcode("galleryItem", async function (photo) {
    const [thumb, full] = await Promise.all([getThumb(photo.absPath, photo.title), getFull(photo.absPath)]);
    const title = photo.title.replace(/"/g, "&quot;");

    return `<a class="gallery-item" href="${full.jpegUrl}"
        data-aspect-ratio="${thumb.aspectRatio.toFixed(4)}" data-title="${title}">
      ${thumb.html}
      <span class="gallery-item-caption">${photo.title}</span>
    </a>`;
  });

  // Renders a homepage "door" -- a hover-expanding panel linking to one
  // category's gallery, with its cover photo as a CSS background image (not
  // an <img>, since it's a background panel rather than sized content).
  eleventyConfig.addAsyncShortcode("categoryDoor", async function (category) {
    const cover = await getThumb(category.cover, category.title);
    const count = category.photos.length;
    const accentStyle = category.accent ? `--door-accent:${category.accent};` : "";

    return `<a class="door" href="/gallery/${category.slug}/"
        style="background-image:url('${cover.url}');${accentStyle}">
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
