import PhotoSwipeLightbox from "/vendor/photoswipe/photoswipe-lightbox.esm.js";

document.querySelectorAll(".justified-gallery").forEach((gallery) => {
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: "a.gallery-item",
    pswpModule: () => import("/vendor/photoswipe/photoswipe.esm.js"),
  });
  lightbox.init();
});
