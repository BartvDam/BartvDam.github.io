const lb = document.getElementById("lb");
if (lb) {
  const items = Array.from(document.querySelectorAll(".justified-gallery .gallery-item"));
  const img = document.getElementById("lb-img");
  const name = document.getElementById("lb-name");
  const latin = document.getElementById("lb-latin");
  const desc = document.getElementById("lb-desc");
  const count = document.getElementById("lb-count");
  let index = 0;
  let lastFocus = null;

  const render = () => {
    const item = items[index];
    img.src = item.getAttribute("href");
    img.alt = item.dataset.title || "";
    count.textContent = (index + 1) + " / " + items.length;

    const nameParts = [item.dataset.nl, item.dataset.en].filter(Boolean);
    name.textContent = nameParts.length ? nameParts.join(" · ") : (item.dataset.title || "");

    if (item.dataset.latin) {
      latin.textContent = item.dataset.latin;
      latin.style.display = "";
      // Tint the latin name with the category's own accent (inherited by
      // the gallery item as --hl) so the lightbox echoes that gallery's color.
      latin.style.color = getComputedStyle(item).getPropertyValue("--hl").trim();
    } else {
      latin.textContent = "";
      latin.style.display = "none";
    }

    if (item.dataset.description) {
      desc.textContent = item.dataset.description;
      desc.style.display = "";
    } else {
      desc.textContent = "";
      desc.style.display = "none";
    }
  };

  const open = (i) => {
    index = i;
    lastFocus = document.activeElement;
    render();
    lb.classList.add("on");
    document.body.style.overflow = "hidden";
    document.getElementById("lb-close").focus();
  };

  const close = () => {
    lb.classList.remove("on");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };

  const step = (dir) => {
    index = (index + dir + items.length) % items.length;
    render();
  };

  items.forEach((item, i) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      open(i);
    });
  });

  document.getElementById("lb-close").addEventListener("click", close);
  document.querySelector(".lb-prev").addEventListener("click", () => step(-1));
  document.querySelector(".lb-next").addEventListener("click", () => step(1));
  lb.addEventListener("click", (e) => {
    if (e.target === lb) close();
  });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("on")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
}
