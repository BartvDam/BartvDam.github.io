const path = require("path");
const { DateTime } = require("luxon");
const { getThumb, getFull } = require("./src/_11ty/images.js");

module.exports = function (eleventyConfig) {
  // Static assets
  eleventyConfig.addPassthroughCopy({ "src/assets/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/images": "images" });

  // Vendored PhotoSwipe (ships its own ESM build, no bundler needed)
  eleventyConfig.addPassthroughCopy({
    "node_modules/photoswipe/dist/photoswipe.esm.js": "vendor/photoswipe/photoswipe.esm.js",
    "node_modules/photoswipe/dist/photoswipe-lightbox.esm.js": "vendor/photoswipe/photoswipe-lightbox.esm.js",
    "node_modules/photoswipe/dist/photoswipe.css": "vendor/photoswipe/photoswipe.css",
  });

  eleventyConfig.addWatchTarget("photos/");
  eleventyConfig.addWatchTarget("src/assets/");

  // Renders one gallery photo: responsive thumbnail markup + lightbox data
  // attributes pointing at the capped/watermarked full-size version.
  eleventyConfig.addAsyncShortcode("galleryItem", async function (photo) {
    const [thumb, full] = await Promise.all([getThumb(photo.absPath, photo.title), getFull(photo.absPath)]);

    return `<a class="gallery-item" href="${full.jpegUrl}" target="_blank" rel="noopener"
        data-pswp-src="${full.jpegUrl}" data-pswp-width="${full.width}" data-pswp-height="${full.height}"
        data-aspect-ratio="${thumb.aspectRatio.toFixed(4)}" data-cropped="false">
      ${thumb.html}
      <span class="gallery-item-caption">${photo.title}</span>
    </a>`;
  });

  // Renders a category tile (used on the homepage).
  eleventyConfig.addAsyncShortcode("categoryTile", async function (category) {
    const thumb = await getThumb(category.cover, category.title);
    return `<a class="tile" href="/gallery/${category.slug}/">
      ${thumb.html}
      <span class="tile-caption">${category.title}</span>
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
