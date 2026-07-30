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
   griglia mostrava bici piccole e grandi. Misuriamo il riquadro reale
   della bici su una MINIATURA SAME-ORIGIN (proxy /cdn/ di Shopify: il
   canvas resta leggibile, niente blocchi CORS) e compensiamo con zoom e
   centratura via variabili CSS. */
(function () {
  var TARGET = 0.9, MAXZ = 1.6, MINZ = 1.02;

  function probeUrl(src) {
    try {
      var u = new URL(src, location.href);
      if (u.hostname === "cdn.shopify.com") {
        u = new URL(u.pathname.replace(/^\/s\/files\/1\/\d+\/\d+\/\d+\//, "/cdn/shop/") + u.search, location.origin);
      } else if (u.origin !== location.origin) {
        return null;
      }
      u.searchParams.set("width", "180");
      return u.href;
    } catch (e) { return null; }
  }

  function misura(el, applicaA) {
    try {
      if (!el.naturalWidth || !el.naturalHeight) return;
      var w = 96, h = Math.max(8, Math.round(w * el.naturalHeight / el.naturalWidth));
      var cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      var cx = cv.getContext("2d", { willReadFrequently: true });
      cx.drawImage(el, 0, 0, w, h);
      var d = cx.getImageData(0, 0, w, h).data;
      var x0 = w, x1 = -1, y0 = h, y1 = -1, x, y, i;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        if (d[i + 3] > 40 && (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240)) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0 || y1 < 0) return;
      var fw = (x1 - x0 + 1) / w, fh = (y1 - y0 + 1) / h;
      if (fw > 0.96 && fh > 0.96) return; // fondo non bianco (es. usato): non toccare
      var s = Math.max(MINZ, Math.min(MAXZ, Math.min(TARGET / fw, TARGET / fh)));
      applicaA.style.setProperty("--nz", s.toFixed(3));
      applicaA.style.setProperty("--nx", (-((x0 + x1 + 1) / 2 / w - 0.5) * 100).toFixed(1) + "%");
      applicaA.style.setProperty("--ny", (-((y0 + y1 + 1) / 2 / h - 0.5) * 100).toFixed(1) + "%");
    } catch (e) { /* canvas non leggibile: resta lo zoom standard */ }
  }

  function fit(img) {
    if (img.dataset.dzFitDone) return;
    img.dataset.dzFitDone = "1";
    var pu = probeUrl(img.currentSrc || img.src);
    if (pu) {
      var probe = new Image();
      probe.decoding = "async";
      probe.onload = function () { misura(probe, img); };
      probe.onerror = function () { misura(img, img); };
      probe.src = pu;
    } else {
      misura(img, img);
    }
  }

  function scan() {
    document.querySelectorAll(".prod .pimg img[data-dz-fit]").forEach(function (img) {
      if (img.complete && img.naturalWidth) fit(img);
      else img.addEventListener("load", function () { fit(img); }, { once: true });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
