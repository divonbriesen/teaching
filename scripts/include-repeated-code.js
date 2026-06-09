async function loadComponent(path, target, className) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  target.className = className;
  target.innerHTML = await response.text();
}

document.addEventListener("DOMContentLoaded", async () => {
  const siteHeader = document.querySelector("body > header");
  const siteFooter = document.querySelector("body > footer");

  try {
    if (siteHeader) {
      await loadComponent("components/header.html", siteHeader, "site-header");
    }

    if (siteFooter) {
      await loadComponent("components/footer.html", siteFooter, "site-footer");
    }
  } catch (error) {
    console.error("Unable to load shared page components.", error);
  }
});