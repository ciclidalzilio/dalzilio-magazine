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

/* Bici di dimensione uniforme nelle card: le foto dei produttori hanno
   margini bianchi diversi (Scott larghi, Trek stretti), quindi la stessa
   griglia mostrava bici piccole e grandi. Qui misuriamo il margine bianco
   di ogni foto su un canvas in miniatura e compensiamo con zoom e
   centratura, cosi' tutte le bici occupano la card allo stesso modo. */
(function () {
  var TARGET = 0.9;   // frazione della card che il soggetto deve occupare
  var MAXZ = 1.6, MINZ = 1.02;

  function fit(img) {
    if (img.dataset.dzFitDone) return;
    img.dataset.dzFitDone = "1";
    try {
      if (!img.naturalWidth || !img.naturalHeight) return;
      var w = 96, h = Math.max(8, Math.round(w * img.naturalHeight / img.naturalWidth));
      var cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      var cx = cv.getContext("2d", { willReadFrequently: true });
      cx.drawImage(img, 0, 0, w, h);
      var d = cx.getImageData(0, 0, w, h).data;
      var x0 = w, x1 = -1, y0 = h, y1 = -1, x, y, i;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        // pixel "pieno": non trasparente e non quasi-bianco
        if (d[i + 3] > 40 && (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240)) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0 || y1 < 0) return;
      var fw = (x1 - x0 + 1) / w, fh = (y1 - y0 + 1) / h;
      // foto senza margini chiari (es. usato su sfondo reale): non toccare
      if (fw > 0.96 && fh > 0.96) return;
      var s = Math.min(TARGET / fw, TARGET / fh);
      s = Math.max(MINZ, Math.min(MAXZ, s));
      var tx = -((x0 + x1 + 1) / 2 / w - 0.5) * 100;
      var ty = -((y0 + y1 + 1) / 2 / h - 0.5) * 100;
      img.style.setProperty("--nz", s.toFixed(3));
      img.style.setProperty("--nx", tx.toFixed(1) + "%");
      img.style.setProperty("--ny", ty.toFixed(1) + "%");
    } catch (e) { /* canvas non leggibile (CORS): resta lo zoom standard */ }
  }

  function scan() {
    document.querySelectorAll(".prod .pimg img[data-dz-fit]").forEach(function (img) {
      if (img.complete) fit(img);
      else img.addEventListener("load", function () { fit(img); }, { once: true });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
