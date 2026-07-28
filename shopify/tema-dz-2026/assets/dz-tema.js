/* DZ 2026 — comportamenti globali: menu mobile. Nessuna scrittura verso Shopify. */
(function () {
  "use strict";
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobMenu");
  if (!burger || !menu) return;

  function apri(v) {
    menu.classList.toggle("open", v);
    burger.classList.toggle("on", v);
    burger.setAttribute("aria-expanded", v ? "true" : "false");
    document.body.classList.toggle("mm-open", v);
    document.body.style.overflow = v ? "hidden" : "";
  }
  burger.addEventListener("click", function () {
    apri(!menu.classList.contains("open"));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) apri(false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") apri(false);
  });
})();
