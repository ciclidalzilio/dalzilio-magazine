/* dz-galleria.js — Cicli Dal Zilio
 *
 * Galleria della scheda prodotto:
 *  - quando si sceglie un colore, nel rail restano solo le foto di quel colore
 *    (le foto senza colore riconoscibile restano sempre visibili);
 *  - il legame foto→colore viene ricostruito anche qui nel browser: foto
 *    principale della variante (stesso file), foto "sorelle" caricate a mano
 *    con lo stesso nome base (es. modello-colore-01 → -02, -03...) e, per le
 *    foto Trek dai nomi cifrati, il colore della foto principale caricata
 *    subito prima;
 *  - frecce avanti/indietro sulla foto grande, tasti freccia da tastiera
 *    e swipe con il dito su mobile;
 *  - zoom adattivo su mobile: misura il bianco attorno alla bici e
 *    ingrandisce solo quanto serve (variabile CSS --dz-zoom).
 *
 * Si appoggia a dz-prodotto.js (che gestisce la selezione della variante)
 * e non scrive nulla su Shopify.
 */
(function () {
  "use strict";

  var sez = document.querySelector("[data-dz-prodotto]");
  if (!sez) return;
  var foto = document.getElementById("dz-foto");
  var rail = sez.querySelector("[data-dz-thumbs]");
  var main = sez.querySelector(".dz-main");
  if (!foto || !rail || !main) return;

  var thumbs = Array.prototype.slice.call(rail.querySelectorAll("[data-dz-thumb]"));
  if (!thumbs.length) return;

  var VARIANTI = [];
  try {
    VARIANTI = JSON.parse(sez.querySelector("[data-dz-varianti]").textContent);
  } catch (e) { VARIANTI = []; }

  /* ---------- colore attivo e varianti di quel colore ---------- */
  function nomiColori() {
    return Array.prototype.map.call(sez.querySelectorAll("[data-colore]"), function (b) {
      return b.dataset.colore;
    });
  }
  function coloreAttivo() {
    var sw = sez.querySelector("[data-colore].on");
    return sw ? sw.dataset.colore : "";
  }
  function coloreDi(v, nomi) {
    if (v.colore_vero) return v.colore_vero;
    var t = String(v.titolo).toLowerCase();
    for (var i = 0; i < nomi.length; i++) {
      if (nomi[i] && t.indexOf(String(nomi[i]).toLowerCase()) !== -1) return nomi[i];
    }
    return "";
  }
  function idsDelColore(col) {
    var nomi = nomiColori();
    return VARIANTI.filter(function (v) { return coloreDi(v, nomi) === col; })
                   .map(function (v) { return String(v.id); });
  }
  function idsMiniatura(th) {
    return (th.dataset.varianti || "").split(",").filter(Boolean);
  }
  function visibili() {
    return thumbs.filter(function (t) { return !t.hidden; });
  }

  /* ---------- legame foto → varianti ricostruito nel browser ----------
   * 1) Ogni miniatura il cui file coincide con la foto principale di una
   *    variante prende le varianti di quella foto (indipendentemente da Liquid).
   * 2) Foto caricate a mano con nome base + numero (modello-colore-01.jpg,
   *    -02.jpg...): le foto senza colore ereditano le varianti della sorella
   *    con lo stesso nome base già legata.
   * 3) Foto Trek (nome = 32 caratteri esadecimali): il feed le carica per colore,
   *    prima la principale poi i dettagli, a pochi secondi di distanza. L'orario
   *    di caricamento ("?v=") permette di dare a ogni foto senza colore le
   *    varianti della foto già legata caricata subito prima (entro 15 minuti).
   */
  function versione(src) {
    var m = /[?&]v=(\d+)/.exec(src || "");
    return m ? parseInt(m[1], 10) : 0;
  }
  function nomeFile(src) {
    var m = /\/([^\/?#]+)(?:[?#]|$)/.exec(src || "");
    return m ? m[1].toLowerCase() : "";
  }
  function nomeBase(file) {
    var m = /^(.+?)-\d{1,3}\.(?:jpe?g|png|webp)$/.exec(file || "");
    return m ? m[1] : "";
  }
  function legaFoto() {
    /* 1) stesso file della foto variante */
    var perFile = {};
    VARIANTI.forEach(function (v) {
      var f = nomeFile(v.foto);
      if (!f) return;
      (perFile[f] = perFile[f] || []).push(String(v.id));
    });
    thumbs.forEach(function (t) {
      var f = nomeFile(t.dataset.src);
      if (!perFile[f]) return;
      var ids = idsMiniatura(t);
      perFile[f].forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
      t.dataset.varianti = ids.join(",");
    });

    /* 2) sorelle con lo stesso nome base (foto caricate a mano) */
    var perBase = {};
    thumbs.forEach(function (t) {
      if (!idsMiniatura(t).length) return;
      var b = nomeBase(nomeFile(t.dataset.src));
      if (b && !perBase[b]) perBase[b] = t.dataset.varianti;
    });
    thumbs.forEach(function (t) {
      if (idsMiniatura(t).length) return;
      var b = nomeBase(nomeFile(t.dataset.src));
      if (b && perBase[b]) t.dataset.varianti = perBase[b];
    });

    /* 3) foto Trek: eredita dal blocco di caricamento */
    var legate = thumbs.filter(function (t) { return idsMiniatura(t).length > 0 && versione(t.dataset.src) > 0; })
                       .map(function (t) { return { v: versione(t.dataset.src), ids: t.dataset.varianti }; });
    if (legate.length < 2) return;   /* serve almeno un colore alternativo */
    thumbs.forEach(function (t) {
      if (idsMiniatura(t).length) return;
      if (!/^[0-9a-f]{32}\.(jpe?g|png|webp)$/.test(nomeFile(t.dataset.src))) return;
      var v = versione(t.dataset.src);
      if (!v) return;
      var best = null;
      legate.forEach(function (l) {
        if (l.v <= v && v - l.v <= 900 && (!best || l.v > best.v)) best = l;
      });
      if (best) t.dataset.varianti = best.ids;
    });
  }

  /* ---------- filtro del rail ---------- */
  function filtra() {
    var col = coloreAttivo();
    var ids = col ? idsDelColore(col) : [];
    var associate = thumbs.some(function (t) { return idsMiniatura(t).length > 0; });

    thumbs.forEach(function (t) {
      if (!col || !ids.length || !associate) { t.hidden = false; return; }
      var mie = idsMiniatura(t);
      if (!mie.length) { t.hidden = false; return; }
      t.hidden = !mie.some(function (id) { return ids.indexOf(id) !== -1; });
    });
    if (!visibili().length) thumbs.forEach(function (t) { t.hidden = false; });

    /* miniatura attiva = quella della foto grande; altrimenti la prima visibile.
       Se la foto grande è quella della variante (scelta da dz-prodotto.js) ma
       non ha una miniatura, resta com'è: non va sostituita con un'altra foto. */
    var src = foto.getAttribute("src");
    var vis = visibili();
    var attiva = vis.filter(function (t) { return t.dataset.src === src; })[0];
    thumbs.forEach(function (t) { t.classList.remove("on"); });
    if (attiva) {
      attiva.classList.add("on");
    } else if (vis[0]) {
      var fotoVariante = VARIANTI.some(function (v) { return v.foto && v.foto === src; });
      vis[0].classList.add("on");
      if (!fotoVariante) foto.src = vis[0].dataset.src;
    }
    main.classList.toggle("dz-single", vis.length < 2);
  }

  /* ---------- frecce ---------- */
  function vai(delta) {
    var vis = visibili();
    if (vis.length < 2) return;
    var cur = vis.indexOf(vis.filter(function (t) { return t.classList.contains("on"); })[0]);
    var n = (cur + delta + vis.length) % vis.length;
    vis[n].click();
    if (vis[n].scrollIntoView) vis[n].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  sez.addEventListener("click", function (e) {
    if (e.target.closest("[data-dz-prev]")) { vai(-1); return; }
    if (e.target.closest("[data-dz-next]")) { vai(1); return; }
    if (e.target.closest("[data-colore]") || e.target.closest("[data-taglia]") || e.target.closest("[data-dz-calcola]")) {
      setTimeout(filtra, 0);
    }
  });

  window.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (document.querySelector(".dz-zoombox.open")) return;
    if (e.key === "ArrowLeft") vai(-1);
    if (e.key === "ArrowRight") vai(1);
  });

  /* ---------- zoom adattivo su mobile ----------
   * Legge la foto in un piccolo canvas, trova il rettangolo che contiene la bici
   * (tutto ciò che non è bianco/quasi bianco) e calcola quanto ingrandire perché
   * la bici riempia circa il 93% del riquadro, senza mai uscirne.
   * Limiti: min 1 (mai rimpicciolire), max 1.3. Se la lettura fallisce → 1.
   */
  var boxCache = {};   /* src → {l,t,r,b} in frazione 0..1, oppure null */

  function misuraBox(src, cb) {
    if (src in boxCache) { cb(boxCache[src]); return; }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        var W = 160, H = Math.max(1, Math.round(W * img.naturalHeight / img.naturalWidth));
        var c = document.createElement("canvas");
        c.width = W; c.height = H;
        var ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, W, H);
        var d = ctx.getImageData(0, 0, W, H).data;
        var l = W, t = H, r = -1, b = -1;
        for (var y = 0; y < H; y++) {
          for (var x = 0; x < W; x++) {
            var i = (y * W + x) * 4;
            var pieno = d[i + 3] > 40 && (d[i] < 232 || d[i + 1] < 232 || d[i + 2] < 232);
            if (pieno) {
              if (x < l) l = x; if (x > r) r = x;
              if (y < t) t = y; if (y > b) b = y;
            }
          }
        }
        if (r < 0 || (r - l) < W * 0.2) { boxCache[src] = null; cb(null); return; }
        boxCache[src] = { l: l / W, t: t / H, r: (r + 1) / W, b: (b + 1) / H, ar: img.naturalWidth / img.naturalHeight };
        cb(boxCache[src]);
      } catch (e) { boxCache[src] = null; cb(null); }
    };
    img.onerror = function () { boxCache[src] = null; cb(null); };
    img.src = src;
  }

  function applicaZoom() {
    if (window.innerWidth > 960) { main.style.removeProperty("--dz-zoom"); return; }
    var src = foto.currentSrc || foto.src;
    if (!src) return;
    misuraBox(src, function (box) {
      if ((foto.currentSrc || foto.src) !== src) return;   /* nel frattempo è cambiata foto */
      if (!box) { main.style.setProperty("--dz-zoom", "1"); return; }
      var cw = main.clientWidth, ch = main.clientHeight;
      if (!cw || !ch) return;
      /* dimensione della foto con object-fit: contain */
      var dw = Math.min(cw, ch * box.ar), dh = dw / box.ar;
      var bw = dw * (box.r - box.l), bh = dh * (box.b - box.t);
      var z = Math.min(0.93 * cw / bw, 0.93 * ch / bh);
      z = Math.max(1, Math.min(1.3, z));
      main.style.setProperty("--dz-zoom", z.toFixed(3));
    });
  }

  foto.addEventListener("load", applicaZoom);
  new MutationObserver(applicaZoom).observe(foto, { attributes: true, attributeFilter: ["src"] });
  var rz;
  window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(applicaZoom, 150); });

  /* ---------- swipe con il dito sulla foto grande ---------- */
  var sw = { x: 0, y: 0, t: 0, attivo: false, mosso: false };
  main.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    sw.x = e.touches[0].clientX; sw.y = e.touches[0].clientY;
    sw.t = Date.now(); sw.attivo = true; sw.mosso = false;
  }, { passive: true });
  main.addEventListener("touchmove", function (e) {
    if (!sw.attivo) return;
    var dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      sw.mosso = true;
      main.classList.add("dz-swiping");
      foto.style.transform = "translateX(" + Math.max(-60, Math.min(60, dx * 0.35)) + "px) scale(var(--dz-zoom,1))";
    }
  }, { passive: true });
  function fineSwipe(e) {
    if (!sw.attivo) return;
    sw.attivo = false;
    main.classList.remove("dz-swiping");
    foto.style.transform = "";
    if (!sw.mosso) return;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - sw.x, dy = t.clientY - sw.y, dt = Date.now() - sw.t;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2 || dt > 800) return;
    vai(dx < 0 ? 1 : -1);
    /* impedisce che il tocco apra lo zoom */
    main.dataset.dzNoZoom = "1";
    setTimeout(function () { delete main.dataset.dzNoZoom; }, 400);
  }
  main.addEventListener("touchend", fineSwipe, { passive: true });
  main.addEventListener("touchcancel", fineSwipe, { passive: true });
  foto.addEventListener("click", function (e) {
    if (main.dataset.dzNoZoom) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  /* ---------- avvio ---------- */
  legaFoto();
  filtra();
  setTimeout(filtra, 60);
  applicaZoom();
  if (foto.complete) setTimeout(applicaZoom, 100);
})();
