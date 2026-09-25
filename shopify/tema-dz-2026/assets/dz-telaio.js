/* DZ 2026 — scheda telaio: il configuratore.
   Tiene lo stato delle scelte (variante del telaio, kit, misure), aggiorna foto,
   riepilogo e totale, e aggiunge al carrello telaio e kit in un colpo solo.
   Le misure vanno come note della riga del telaio; il kit porta la nota
   "Montato su". Nessun dato del negozio viene modificato. */
(function () {
  "use strict";
  var root = document.querySelector("[data-dzt]");
  if (!root) return;
  var D;
  try { D = JSON.parse(root.querySelector("[data-dzt-dati]").textContent); } catch (e) { return; }
  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }

  /* ---- soldi nel formato del negozio (es. "€{{amount_with_comma_separator}}") ---- */
  function soldi(cent) {
    var fmt = D.moneta || "€{{amount_with_comma_separator}}";
    function f(n, dec, mil, sep) {
      var s = (n / 100).toFixed(dec).split(".");
      s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, mil);
      return s[1] ? s[0] + sep + s[1] : s[0];
    }
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      if (k === "amount") return f(cent, 2, ",", ".");
      if (k === "amount_no_decimals") return f(cent, 0, ",", ".");
      if (k === "amount_no_decimals_with_comma_separator") return f(cent, 0, ".", ",");
      return f(cent, 2, ".", ",");
    });
  }

  /* ---- stato ---- */
  var gruppiOpt = $$("[data-dzt-opt]");
  var scelte = D.varianti.length ? D.varianti[0].o.slice() : [];
  var iniziale = D.varianti.filter(function (v) { return v.id == $("[data-dzt-id]").value; })[0];
  if (iniziale) scelte = iniziale.o.slice();
  var kit = null;          // oggetto kit scelto, null = solo telaio, "su-misura" = preventivo
  var kitVar = null;       // variante del kit
  var modo = "io";         // "io" | "insieme"
  var misure = {};         // { Manubrio: "40 cm", ... }

  /* taglie in ordine naturale: XXS..XXL oppure numeri crescenti */
  var ORD = ["XXS", "XS", "S", "SM", "M", "ML", "L", "XL", "XXL"];
  gruppiOpt.forEach(function (g) {
    var nome = g.getAttribute("data-dzt-optname");
    if (nome !== "size" && nome !== "taglia") return;
    var box = $(".dzt-chips", g);
    var chips = $$(".dzt-chip", box);
    function peso(t) {
      var i = ORD.indexOf(t.toUpperCase());
      if (i > -1) return i;
      var n = parseFloat(String(t).replace(",", "."));
      return isNaN(n) ? 999 : 100 + n;
    }
    chips.sort(function (a, b) { return peso(a.getAttribute("data-dzt-val")) - peso(b.getAttribute("data-dzt-val")); })
      .forEach(function (c) { box.appendChild(c); });
  });

  function variante() {
    return D.varianti.filter(function (v) {
      return v.o.every(function (x, i) { return x === scelte[i]; });
    })[0] || null;
  }

  /* ---- aggiornamento di tutto cio' che si vede ---- */
  var fotoEl = $("[data-dzt-foto]");
  function aggiorna() {
    var v = variante();

    // disponibilita' dei valori: per ogni gruppo, il valore e' "esaurito" se con
    // le altre scelte fatte non esiste una variante disponibile
    gruppiOpt.forEach(function (g) {
      var i = +g.getAttribute("data-dzt-opt");
      $$(".dzt-chip", g).forEach(function (c) {
        var val = c.getAttribute("data-dzt-val");
        var ok = D.varianti.some(function (x) {
          return x.disp && x.o[i] === val && x.o.every(function (y, j) { return j === i || y === scelte[j]; });
        });
        c.classList.toggle("no", !ok);
        var on = scelte[i] === val;
        c.classList.toggle("on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });

    var disp = $("[data-dzt-disp]");
    if (!v) { disp.textContent = "Questa combinazione non esiste: scegli un'altra taglia o un altro colore."; disp.classList.add("ko"); }
    else if (!v.disp) { disp.textContent = "Esaurito in questa taglia e colore. Scrivici: spesso lo possiamo ordinare."; disp.classList.add("ko"); }
    else { disp.textContent = ""; disp.classList.remove("ko"); }

    if (v) {
      $("[data-dzt-id]").value = v.id;
      if (v.img && fotoEl && fotoEl.getAttribute("src") !== v.img) {
        fotoEl.classList.add("cambia");
        var pre = new Image();
        pre.onload = pre.onerror = function () { fotoEl.src = v.img; fotoEl.classList.remove("cambia"); };
        pre.src = v.img;
      }
    }

    // testi del riepilogo
    var tTelaio = v ? v.t : "—";
    var tKit = "Solo telaio", pKit = "Incluso", cKit = 0;
    if (kit === "su-misura") { tKit = "Montaggio su misura"; pKit = "Preventivo"; }
    else if (kit && kitVar) {
      tKit = kit.titolo + (kit.varianti.length > 1 ? " · " + kitVar.t : "");
      cKit = kitVar.prezzo; pKit = soldi(cKit);
    }
    var tMis;
    if (modo === "insieme") tMis = "Le decidiamo insieme";
    else {
      var parti = [];
      Object.keys(misure).forEach(function (k) { if (misure[k] && misure[k] !== "Di serie") parti.push(k.replace(" manubrio", "") + " " + misure[k]); });
      var sella = sellaCm();
      if (sella) parti.push("sella ≈ " + sella + " cm");
      tMis = parti.length ? parti.join(" · ") : "Di serie";
    }
    var tot = (v ? v.prezzo : 0) + cKit;

    $("[data-dzt-v-telaio]").textContent = tTelaio;
    $("[data-dzt-v-kit]").textContent = tKit;
    $("[data-dzt-v-misure]").textContent = tMis;
    $("[data-dzt-r-telaio]").textContent = tTelaio;
    $("[data-dzt-r-telaio-p]").textContent = v ? soldi(v.prezzo) : "—";
    $("[data-dzt-r-kit]").textContent = tKit;
    $("[data-dzt-r-kit-p]").textContent = pKit;
    $("[data-dzt-r-misure]").textContent = tMis;
    $("[data-dzt-tot]").textContent = soldi(tot) + (kit === "su-misura" ? " + montaggio" : "");
    $("[data-dzt-tot2]").textContent = soldi(tot);

    var add = $("[data-dzt-add]");
    var ok = v && v.disp && !(kit && kit !== "su-misura" && (!kitVar || !kitVar.disp));
    add.disabled = !ok;
    add.textContent = ok ? "Aggiungi al carrello" : "Non disponibile";

    // WhatsApp con la configurazione gia' scritta
    var msg = "Ciao! Vorrei costruire una bici partendo dal " + D.titolo + " (" + tTelaio + ").\nMontaggio: " + tKit + "\nMisure: " + tMis;
    var note = $("[data-dzt-note]").value.trim();
    if (note) msg += "\nNote: " + note;
    $("[data-dzt-wa]").href = "https://wa.me/" + D.wa + "?text=" + encodeURIComponent(msg);
  }

  /* ---- 1. taglia e colore ---- */
  gruppiOpt.forEach(function (g) {
    var i = +g.getAttribute("data-dzt-opt");
    g.addEventListener("click", function (e) {
      var c = e.target.closest(".dzt-chip"); if (!c) return;
      scelte[i] = c.getAttribute("data-dzt-val");
      // se la combinazione non esiste proprio, adatta le altre scelte alla prima
      // variante con questo valore; se esiste ma e' esaurita, la scelta resta e lo diciamo
      if (!variante()) {
        var alt = D.varianti.filter(function (x) { return x.disp && x.o[i] === scelte[i]; })[0]
               || D.varianti.filter(function (x) { return x.o[i] === scelte[i]; })[0];
        if (alt) scelte = alt.o.slice();
      }
      aggiorna();
    });
  });

  /* ---- 2. kit ---- */
  var kitInputs = $$('input[name="dzt-kit"]');
  function leggiKit() {
    var r = kitInputs.filter(function (x) { return x.checked; })[0];
    $$(".dzt-kit").forEach(function (l) { l.classList.toggle("on", !!$("input:checked", l)); });
    if (!r || r.value === "") { kit = null; kitVar = null; }
    else if (r.value === "su-misura") { kit = "su-misura"; kitVar = null; }
    else {
      kit = D.kit.filter(function (k) { return String(k.i) === r.value; })[0] || null;
      if (kit) {
        var sel = $("[data-dzt-kit-var]", r.closest(".dzt-kit"));
        var id = sel ? +sel.value : kit.scelta;
        kitVar = kit.varianti.filter(function (x) { return x.id === id; })[0] || kit.varianti[0];
      }
    }
    aggiorna();
  }
  kitInputs.forEach(function (x) { x.addEventListener("change", leggiKit); });
  $$("[data-dzt-kit-var]").forEach(function (s) {
    s.addEventListener("click", function (e) { e.stopPropagation(); });
    s.addEventListener("change", function () {
      var r = $('input[name="dzt-kit"]', s.closest(".dzt-kit"));
      if (r && !r.checked) r.checked = true;
      leggiKit();
    });
  });

  /* ---- 3. misure ---- */
  $$("[data-dzt-modo]").forEach(function (b) {
    b.addEventListener("click", function () {
      modo = b.getAttribute("data-dzt-modo");
      $$("[data-dzt-modo]").forEach(function (x) {
        var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false");
      });
      $("[data-dzt-misure]").hidden = modo !== "io";
      $("[data-dzt-insieme]").hidden = modo === "io";
      aggiorna();
    });
  });
  $$("[data-dzt-mis]").forEach(function (g) {
    var k = g.getAttribute("data-dzt-mis");
    misure[k] = "Di serie";
    g.addEventListener("click", function (e) {
      var c = e.target.closest(".dzt-chip"); if (!c) return;
      misure[k] = c.getAttribute("data-dzt-val");
      $$(".dzt-chip", g).forEach(function (x) {
        var on = x === c; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false");
      });
      aggiorna();
    });
  });
  /* altezza sella indicativa dal cavallo (formula LeMond: cavallo x 0,883,
     dal centro del movimento centrale al piano della sella) */
  function num(el) { var n = parseFloat(String(el.value).replace(",", ".")); return isNaN(n) ? 0 : n; }
  function sellaCm() {
    var c = num($("[data-dzt-cavallo]"));
    if (c < 60 || c > 105) return "";
    return (Math.round(c * 0.883 * 2) / 2).toFixed(1).replace(".", ",");
  }
  function aggiornaSella() {
    var s = sellaCm(), p = $("[data-dzt-sella]");
    if (s) { p.hidden = false; p.innerHTML = "Altezza sella indicativa <b>" + s + " cm</b><br>dal centro del movimento centrale. La verifichiamo al montaggio."; }
    else p.hidden = true;
    aggiorna();
  }
  $("[data-dzt-cavallo]").addEventListener("input", aggiornaSella);
  $("[data-dzt-altezza]").addEventListener("input", aggiorna);
  $("[data-dzt-note]").addEventListener("input", aggiorna);

  /* ---- 4. carrello: telaio con le misure come note, e il kit ---- */
  $("[data-dzt-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = variante(); if (!v || !v.disp) return;
    var add = $("[data-dzt-add]"), err = $("[data-dzt-err]");
    var props = {};
    props["Montaggio"] = kit === "su-misura" ? "Su misura (preventivo)" : (kit ? kit.titolo + (kit.varianti.length > 1 ? " · " + kitVar.t : "") : "Solo telaio");
    if (modo === "insieme") props["Misure"] = "Da decidere insieme in negozio";
    else {
      Object.keys(misure).forEach(function (k) { props[k] = misure[k]; });
      var h = num($("[data-dzt-altezza]")), c = num($("[data-dzt-cavallo]"));
      if (h) props["Altezza ciclista"] = String(h).replace(".", ",") + " cm";
      if (c) props["Cavallo"] = String(c).replace(".", ",") + " cm";
      if (sellaCm()) props["Altezza sella indicativa"] = sellaCm() + " cm";
    }
    var note = $("[data-dzt-note]").value.trim();
    if (note) props["Note per l'officina"] = note;
    var build = "B" + Date.now().toString(36).toUpperCase();
    props["_Montaggio n."] = build;

    var items = [{ id: v.id, quantity: 1, properties: props }];
    if (kit && kit !== "su-misura" && kitVar) {
      items.push({ id: kitVar.id, quantity: 1, properties: { "Montato su": D.titolo + " · " + v.t, "_Montaggio n.": build } });
    }

    add.disabled = true; add.textContent = "Aggiungo…"; err.hidden = true;
    fetch(D.aggiungi, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ items: items })
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || "Errore"); return j; });
    }).then(function () {
      location.href = D.carrello;
    }).catch(function (x) {
      err.textContent = "Non siamo riusciti ad aggiungere al carrello: " + x.message + ". Riprova o scrivici su WhatsApp.";
      err.hidden = false;
      aggiorna();
    });
  });

  /* barra in basso su telefono: sparisce quando il riepilogo e' sullo schermo */
  var barra = $("[data-dzt-barra]"), riep = $("#dzt-riepilogo");
  if (barra && riep && "IntersectionObserver" in window) {
    new IntersectionObserver(function (v) { barra.classList.toggle("via", v[0].isIntersecting); }, { threshold: 0.15 }).observe(riep);
  }

  aggiorna();
})();
