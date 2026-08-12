const lb = document.getElementById("lb");
if (lb) {
  const items = Array.from(document.querySelectorAll(".justified-gallery .gallery-item"));
  const img = document.getElementById("lb-img");
  const count = document.getElementById("lb-count");
  const cap = document.getElementById("lb-cap");
  const titleEl = document.getElementById("lb-title");
  const blurbEl = document.getElementById("lb-blurb");
  const locEl = document.getElementById("lb-loc");
  const locText = document.getElementById("lb-loc-text");
  const specsEl = document.getElementById("lb-specs");
  let index = 0;
  let lastFocus = null;

  const makeSep = () => {
    const sep = document.createElement("span");
    sep.className = "lb-title-sep";
    sep.textContent = "·";
    return sep;
  };

  // English name (primary) · Dutch name (secondary, only shown alongside an
  // English one -- otherwise it IS the primary) · Latin name (italic).
  // Falls back to the plain title when none of nl/en are set.
  const renderTitle = (item) => {
    titleEl.innerHTML = "";
    const en = item.dataset.en;
    const nl = item.dataset.nl;
    const latin = item.dataset.latin;

    const primarySpan = document.createElement("span");
    primarySpan.textContent = en || nl || item.dataset.title || "";
    titleEl.appendChild(primarySpan);

    if (en && nl) {
      titleEl.appendChild(makeSep());
      const sec = document.createElement("span");
      sec.className = "lb-title-sec";
      sec.textContent = nl;
      titleEl.appendChild(sec);
    }

    if (latin) {
      titleEl.appendChild(makeSep());
      const la = document.createElement("span");
      la.className = "lb-title-la";
      la.textContent = latin;
      titleEl.appendChild(la);
    }
  };

  const renderSpecs = (item) => {
    specsEl.innerHTML = "";
    let metaArr = [];
    if (item.dataset.meta) {
      try {
        metaArr = JSON.parse(item.dataset.meta);
      } catch (e) {
        metaArr = [];
      }
    }
    metaArr.forEach((value) => {
      const pill = document.createElement("span");
      pill.className = "lb-pill";
      pill.textContent = value;
      specsEl.appendChild(pill);
    });
    specsEl.style.display = metaArr.length ? "" : "none";
  };

  const render = () => {
    const item = items[index];
    img.src = item.getAttribute("href");
    img.alt = item.dataset.title || "";
    count.textContent = (index + 1) + " / " + items.length;

    // The lightbox always sits on its own dark backdrop regardless of the
    // page's light/dark theme, so it reuses the category's single fixed
    // accent (--hl, already resolved on the gallery item) rather than
    // anything theme-reactive -- setting it once here lets every CSS rule
    // in the caption (separators, pills, top border) just read var(--hl).
    cap.style.setProperty("--hl", getComputedStyle(item).getPropertyValue("--hl").trim());

    renderTitle(item);

    if (item.dataset.description) {
      blurbEl.textContent = item.dataset.description;
      blurbEl.style.display = "";
    } else {
      blurbEl.textContent = "";
      blurbEl.style.display = "none";
    }

    if (item.dataset.location) {
      locText.textContent = item.dataset.location;
      locEl.style.display = "";
    } else {
      locText.textContent = "";
      locEl.style.display = "none";
    }

    renderSpecs(item);
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
