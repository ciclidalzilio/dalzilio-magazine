/* dz-prodotto.js — Cicli Dal Zilio
 *
 * Logica della scheda prodotto: selezione variante, consigliatore taglia,
 * calcolatore rata, galleria.
 *
 * Non scrive nulla su Shopify: legge i dati già presenti nella pagina.
 */
(function () {
  "use strict";

  var sezione = document.querySelector("[data-dz-prodotto]");
  if (!sezione) return;

  var leggiJSON = function (sel, fallback) {
    var el = sezione.querySelector(sel);
    if (!el) return fallback;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      console.warn("[DZ] JSON non valido in " + sel, e);
      return fallback;
    }
  };

  var GREZZE = leggiJSON("[data-dz-varianti]", []);
  var TABELLE = leggiJSON("[data-dz-tabelle-taglie]", {});
  var NOME = leggiJSON("[data-dz-prodotto-nome]", "");
  if (!GREZZE.length) return;

  /* Taglia e colore non sempre esistono come opzioni: nel catalogo importato
     stanno dentro il titolo della variante. Qui li ricaviamo, senza toccare i dati. */
  var TAGLIE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

  function ricavaTaglia(titolo) {
    var parole = String(titolo).replace(/[\/(),]/g, " ").split(/\s+/).filter(Boolean);
    for (var i = parole.length - 1; i >= 0; i--) {
      var w = parole[i].toUpperCase();
      if (TAGLIE.indexOf(w) !== -1) return w;
      if (/^(4[4-9]|5[0-9]|6[0-4])$/.test(w)) return w;
    }
    return "";
  }

  function ricavaColore(titolo) {
    var s = String(titolo);
    String(NOME).split(/\s+/).forEach(function (w) {
      if (w.length >= 2) s = s.replace(new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi"), " ");
    });
    return s
      .replace(/\bbike\b/gi, " ")
      .replace(/\((?:EU|TW|IT|DE|US|CH)\)/gi, " ")
      .replace(/\b[A-Z]{4}\b\s*\/?/g, " ")
      .replace(/\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/g, " ")
      .replace(/\b(4[4-9]|5[0-9]|6[0-4])\b/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s\/\-–]+|[\s\/\-–]+$/g, "")
      .trim();
  }

  var VARIANTI = GREZZE.map(function (v) {
    var t = v.taglia_vera || ricavaTaglia(v.titolo);
    var c = v.colore_vero || ricavaColore(v.titolo);
    if (c === "Default Title" || c === t) c = "";
    return { id: v.id, taglia: t, colore: c, disponibile: v.disponibile, sku: v.sku, ean: v.ean,
             prezzo: v.prezzo, listino: v.listino, prezzo_html: v.prezzo_html, foto: "" };
  });

  var $ = function (s) { return sezione.querySelector(s); };
  var euro = function (n) {
    return "€ " + Number(n).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  /* ---------- stato ---------- */
  var colori = [];
  VARIANTI.forEach(function (v) {
    if (v.colore && colori.indexOf(v.colore) === -1) colori.push(v.colore);
  });
  var haTaglie = VARIANTI.some(function (v) { return v.taglia; });

  var iniziale = VARIANTI.filter(function (v) { return v.disponibile; })[0] || VARIANTI[0];
  var stato = { colore: iniziale.colore, taglia: iniziale.taglia };

  /* ---------- selezione variante ---------- */
  function varianteCorrente() {
    return (
      VARIANTI.filter(function (v) {
        return (!stato.colore || v.colore === stato.colore) && (!stato.taglia || v.taglia === stato.taglia);
      })[0] || null
    );
  }

  function taglieDelColore(colore) {
    return VARIANTI.filter(function (v) {
      return !colore || v.colore === colore;
    });
  }

  function aggiorna() {
    var v = varianteCorrente();
    if (!v) return;

    var campo = $("[data-dz-variante]");
    if (campo) campo.value = v.id;

    var prezzo = $("[data-dz-prezzo]");
    if (prezzo) prezzo.textContent = v.prezzo_html;
    var prezzoBtn = $("[data-dz-prezzo-btn]");
    if (prezzoBtn) prezzoBtn.textContent = v.prezzo_html;
    var prezzoBar = $("[data-dz-bar-prezzo]");
    if (prezzoBar) prezzoBar.textContent = v.prezzo_html;

    var listino = $("[data-dz-listino]");
    var sconto = $("[data-dz-sconto]");
    if (listino && sconto) {
      if (v.listino > v.prezzo) {
        listino.textContent = euro(v.listino);
        sconto.textContent = "−" + Math.round((1 - v.prezzo / v.listino) * 100) + "%";
        listino.hidden = false;
        sconto.hidden = false;
      } else {
        listino.hidden = true;
        sconto.hidden = true;
      }
    }

    var aggiungi = $("[data-dz-aggiungi]");
    if (aggiungi) {
      aggiungi.disabled = !v.disponibile;
      if (!v.disponibile) aggiungi.firstChild.textContent = "Non disponibile ";
    }

    if (v.foto) {
      var foto = document.getElementById("dz-foto");
      if (foto && foto.src !== v.foto) foto.src = v.foto;
    }

    var skuEl = $("[data-dz-sku]");
    if (skuEl && v.sku) { skuEl.textContent = v.sku; skuEl.parentElement.hidden = false; }
    var eanEl = $("[data-dz-ean]");
    if (eanEl && v.ean) { eanEl.textContent = v.ean; eanEl.parentElement.hidden = false; }

    calcolaRata();
    disegnaTaglie();
  }

  /* ---------- colori ---------- */
  function disegnaColori() {
    var box = $("[data-dz-colori]");
    var blocco = $("[data-dz-blocco-colore]");
    if (!box || colori.length < 2) return;
    blocco.hidden = false;

    box.innerHTML = colori
      .map(function (c) {
        var attivo = c === stato.colore ? " on" : "";
        return '<button type="button" class="dz-sw' + attivo + '" data-colore="' + c.replace(/"/g, "&quot;") + '" title="' + c + '"><span>' + c + "</span></button>";
      })
      .join("");

    var nome = $("[data-dz-colore-nome]");
    if (nome) nome.textContent = stato.colore || "";
  }

  /* ---------- taglie ---------- */
  function disegnaTaglie() {
    var box = $("[data-dz-taglie]");
    var blocco = $("[data-dz-blocco-taglia]");
    if (!box || !haTaglie) return;
    blocco.hidden = false;

    var lista = taglieDelColore(stato.colore).filter(function (v) { return v.taglia; });
    box.innerHTML = lista
      .map(function (v) {
        var cls = "dz-size" + (v.taglia === stato.taglia ? " on" : "") + (v.disponibile ? "" : " off");
        return (
          '<button type="button" class="' + cls + '" data-taglia="' + v.taglia + '"' +
          (v.disponibile ? "" : ' disabled title="Non disponibile"') + ">" + v.taglia + "</button>"
        );
      })
      .join("");

    var n = $("[data-dz-ntaglie]");
    if (n) n.textContent = lista.length;
  }

  /* ---------- consigliatore taglia ---------- */
  function tabellaPer(marca) {
    var chiavi = Object.keys(TABELLE);
    for (var i = 0; i < chiavi.length; i++) {
      if (chiavi[i].toUpperCase() === String(marca).toUpperCase()) return TABELLE[chiavi[i]];
    }
    return null;
  }

  function consiglia() {
    var out = $("[data-dz-adv-out]");
    var input = document.getElementById("dz-altezza");
    if (!out || !input) return;

    var h = parseInt(input.value, 10);
    if (!h || h < 140 || h > 210) {
      out.className = "dz-adv-out warn";
      out.textContent = "Inserisci un'altezza tra 140 e 210 cm.";
      return;
    }

    var marca = (sezione.querySelector(".dz-eye") || {}).textContent || "";
    marca = marca.split("·")[0].trim();
    var tabella = tabellaPer(marca);

    var presenti = taglieDelColore(stato.colore).map(function (v) { return v.taglia; });
    var righe = (tabella || []).filter(function (r) { return presenti.indexOf(r[0]) !== -1; });

    if (!righe.length) {
      out.className = "dz-adv-out warn";
      out.textContent = "Per questo modello non abbiamo una tabella taglie: scrivici e ti aiutiamo noi.";
      return;
    }

    var scelta = righe.filter(function (r) { return h >= r[1] && h < r[2]; })[0];
    var fuori = false;
    if (!scelta) {
      fuori = true;
      scelta = h < righe[0][1] ? righe[0] : righe[righe.length - 1];
    }

    var v = taglieDelColore(stato.colore).filter(function (x) { return x.taglia === scelta[0]; })[0];
    var disponibile = v && v.disponibile;

    out.className = "dz-adv-out";
    out.innerHTML =
      "Per " + h + " cm la taglia consigliata è <span class='dz-pill'>" + scelta[0] + "</span>" +
      (fuori ? " (sei ai limiti della gamma, meglio una prova in negozio)" : " — pensata per " + scelta[1] + "–" + scelta[2] + " cm") +
      (disponibile ? ". <b class='dz-ok'>Disponibile</b>, l'abbiamo selezionata per te." : ". <b>Non disponibile</b> ora: scrivici e la ordiniamo.");

    if (disponibile) {
      stato.taglia = scelta[0];
      aggiorna();
    }
  }

  /* ---------- finanziamento ---------- */
  function calcolaRata() {
    var box = $("[data-dz-fin]");
    var v = varianteCorrente();
    if (!v) return;

    var mesiEl = sezione.querySelector("[data-dz-fin-range]");
    var mesi = mesiEl ? parseInt(mesiEl.value, 10) : 48;
    var tan = box ? parseFloat(box.dataset.tan) / 100 : 0;
    var i = tan / 12;
    var rata = i > 0 ? (v.prezzo * i) / (1 - Math.pow(1 + i, -mesi)) : v.prezzo / mesi;

    var da = $("[data-dz-rata]");
    if (da) da.textContent = euro(Math.round(rata));
    var barRata = $("[data-dz-bar-rata]");
    if (barRata) barRata.textContent = euro(Math.round(rata));
    var figRata = document.querySelector("[data-dz-fig-rata]");
    if (figRata) figRata.textContent = euro(Math.round(rata));
    var figMesi = document.querySelector("[data-dz-fig-mesi]");
    if (figMesi) figMesi.textContent = mesi;
    if (box) {
      var r = $("[data-dz-fin-rata]");
      var m = $("[data-dz-fin-mesi]");
      if (r) r.textContent = euro(Math.round(rata));
      if (m) m.textContent = mesi;
    }
  }

  /* ---------- eventi ---------- */
  sezione.addEventListener("click", function (e) {
    var sw = e.target.closest("[data-colore]");
    if (sw) {
      stato.colore = sw.dataset.colore;
      var disp = taglieDelColore(stato.colore).filter(function (v) { return v.disponibile; })[0];
      if (disp) stato.taglia = disp.taglia;
      disegnaColori();
      aggiorna();
      return;
    }

    var sz = e.target.closest("[data-taglia]");
    if (sz && !sz.disabled) {
      stato.taglia = sz.dataset.taglia;
      aggiorna();
      return;
    }

    var th = e.target.closest("[data-dz-thumb]");
    if (th) {
      sezione.querySelectorAll("[data-dz-thumb]").forEach(function (t) { t.classList.remove("on"); });
      th.classList.add("on");
      var foto = document.getElementById("dz-foto");
      if (foto && th.dataset.src) foto.src = th.dataset.src;
      return;
    }

    if (e.target.closest("[data-dz-apri-taglie]")) {
      var adv = $("[data-dz-adv]");
      if (adv) {
        adv.hidden = !adv.hidden;
        if (!adv.hidden) document.getElementById("dz-altezza").focus();
      }
      return;
    }

    if (e.target.closest("[data-dz-calcola]")) { consiglia(); return; }

    var q = e.target.closest("[data-dz-q]");
    if (q) {
      var campo = sezione.querySelector('input[name="quantity"]');
      campo.value = Math.max(1, (parseInt(campo.value, 10) || 1) + parseInt(q.dataset.dzQ, 10));
    }
  });

  sezione.addEventListener("input", function (e) {
    if (e.target.matches("[data-dz-fin-range]")) calcolaRata();
  });

  sezione.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "dz-altezza") {
      e.preventDefault();
      consiglia();
    }
  });

  /* ---------- avvio ---------- */
  disegnaColori();
  aggiorna();

  /* ---------- barra fissa: compare quando la galleria esce dalla vista ---------- */
  var barra = sezione.querySelector("[data-dz-pdpbar]");
  var galleria = sezione.querySelector(".dz-gallery");
  if (barra && galleria && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (voci) {
      barra.classList.toggle("show", !voci[0].isIntersecting);
    }, { rootMargin: "-140px 0px 0px 0px", threshold: 0 });
    io.observe(galleria);

    var barraAdd = barra.querySelector("[data-dz-bar-add]");
    if (barraAdd) {
      barraAdd.addEventListener("click", function () {
        var principale = $("[data-dz-aggiungi]");
        if (principale && !principale.disabled) principale.click();
        else window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  /* ---------- numeri chiave sotto la scheda ---------- */
  var figTaglie = document.querySelector("[data-dz-fig-taglie]");
  if (figTaglie) {
    var setT = {};
    VARIANTI.forEach(function (v) { if (v.taglia) setT[v.taglia] = 1; });
    var quante = Object.keys(setT).length;
    if (quante) figTaglie.textContent = quante;
  }
  if (colori.length > 0) {
    var figColori = document.querySelector("[data-dz-fig-colori]");
    var figColoriLabel = document.querySelector("[data-dz-fig-colori-label]");
    if (figColori) figColori.textContent = colori.length;
    if (figColoriLabel) figColoriLabel.textContent = colori.length === 1 ? "Colorazione" : "Colorazioni";
  }

  /* ---------- zoom foto: si apre al massimo restando tutta nello schermo ---------- */
  var zb = document.querySelector("[data-dz-zoombox]");
  var mainImg = document.getElementById("dz-foto");
  if (zb && mainImg) {
    var zi = zb.querySelector("img");
    var apri = function () { zi.src = mainImg.src; zb.classList.add("open"); };
    var chiudi = function () { zb.classList.remove("open"); };
    mainImg.addEventListener("click", apri);
    zb.addEventListener("click", chiudi);
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") chiudi(); });
  }
})();
