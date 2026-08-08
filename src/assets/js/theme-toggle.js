const button = document.getElementById("theme-toggle");
if (button) {
  const setLabel = () => {
    // Label shows the theme you'd switch TO, matching the mockup's convention.
    button.textContent = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  };
  setLabel();

  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setLabel();
  });
}
