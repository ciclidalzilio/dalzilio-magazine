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

/* Bici di dimensione uniforme nelle card.
   Due cause di bici "piccole": 1) margini di sfondo dentro la foto;
   2) foto quadrate dentro la card larga (object-fit contain le rimpicciolisce).
   Misuriamo il riquadro reale della bici su una miniatura same-origin
   (proxy /cdn/ di Shopify, canvas sempre leggibile, sfondo campionato dai
   bordi) e calcoliamo lo zoom RISPETTO ALLA CARD, tenendo conto del
   rapporto immagine/contenitore. Fallback per marca se il canvas fallisce. */
(function () {
  var TARGET = 0.9, MAXZ = 1.7, MINZ = 1.02;
  var PER_MARCA = { "SCOTT": 1.32, "SCOTT_SPORTS": 1.32, "CANNONDALE": 1.35, "AMFLOW": 1.15, "TREK": 1.05 };

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

  function fallbackMarca(img) {
    var art = img.closest(".prod");
    var v = art && art.dataset.vendor ? art.dataset.vendor.toUpperCase().replace(/[^A-Z]/g, "_") : "";
    if (PER_MARCA[v]) img.style.setProperty("--nz", PER_MARCA[v]);
  }

  function misura(el, img) {
    try {
      if (!el.naturalWidth || !el.naturalHeight) return;
      var w = 96, h = Math.max(8, Math.round(w * el.naturalHeight / el.naturalWidth));
      var cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      var cx = cv.getContext("2d", { willReadFrequently: true });
      cx.drawImage(el, 0, 0, w, h);
      var d = cx.getImageData(0, 0, w, h).data;

      function px(x, y) { var i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }

      /* sfondo = media dei campioni lungo i quattro bordi */
      var camp = [], k;
      for (k = 0; k < 8; k++) {
        camp.push(px(Math.round((w - 1) * k / 7), 0));
        camp.push(px(Math.round((w - 1) * k / 7), h - 1));
        camp.push(px(0, Math.round((h - 1) * k / 7)));
        camp.push(px(w - 1, Math.round((h - 1) * k / 7)));
      }
      var br = 0, bg = 0, bb = 0, varmax = 0;
      camp.forEach(function (c) { br += c[0]; bg += c[1]; bb += c[2]; });
      br /= camp.length; bg /= camp.length; bb /= camp.length;
      camp.forEach(function (c) {
        var dv = Math.abs(c[0] - br) + Math.abs(c[1] - bg) + Math.abs(c[2] - bb);
        if (dv > varmax) varmax = dv;
      });
      /* bordi non uniformi o sfondo scuro: foto vera (usato), non toccare */
      if (varmax > 90 || (br + bg + bb) / 3 < 170) return;

      var x0 = w, x1 = -1, y0 = h, y1 = -1, x, y, i, dv;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        if (d[i + 3] < 40) continue;
        dv = Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb);
        if (dv > 54) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0 || y1 < 0) return;
      var fw = (x1 - x0 + 1) / w, fh = (y1 - y0 + 1) / h;

      /* quanto della CARD occupa oggi la bici: dipende da come il contain
         adatta l'immagine al contenitore (foto quadrate -> piu' piccole) */
      var box = img.closest(".pimg") || img.parentElement;
      var R = (box && box.clientWidth > 0 && box.clientHeight > 0)
        ? box.clientWidth / box.clientHeight : 4 / 2.7;
      var r = el.naturalWidth / el.naturalHeight;
      var dw = r >= R ? 1 : r / R;   /* larghezza mostrata / larghezza card */
      var dh = r >= R ? R / r : 1;   /* altezza mostrata / altezza card */

      var occW = fw * dw, occH = fh * dh;
      if (occW > 0.86 && occH > 0.86) return; /* gia' grande: non toccare */
      var s = Math.max(MINZ, Math.min(MAXZ, Math.min(TARGET / occW, TARGET / occH)));
      img.style.setProperty("--nz", s.toFixed(3));
      img.style.setProperty("--nx", (-((x0 + x1 + 1) / 2 / w - 0.5) * dw * 100).toFixed(1) + "%");
      img.style.setProperty("--ny", (-((y0 + y1 + 1) / 2 / h - 0.5) * dh * 100).toFixed(1) + "%");
    } catch (e) { fallbackMarca(img); }
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
