const lb = document.getElementById("lb");
if (lb) {
  const items = Array.from(document.querySelectorAll(".justified-gallery .gallery-item"));
  const img = document.getElementById("lb-img");
  const title = document.getElementById("lb-title");
  const count = document.getElementById("lb-count");
  let index = 0;
  let lastFocus = null;

  const render = () => {
    const item = items[index];
    img.src = item.getAttribute("href");
    img.alt = item.dataset.title || "";
    title.textContent = item.dataset.title || "";
    count.textContent = (index + 1) + " / " + items.length;
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
