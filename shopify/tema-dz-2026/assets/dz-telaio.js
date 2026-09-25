/* DZ 2026 — scheda telaio: il configuratore.
   Tiene lo stato delle scelte (variante del telaio, kit), aggiorna foto,
   riepilogo e totale, e aggiunge al carrello telaio e kit in un colpo solo.
   Le note per l'officina vanno sulla riga del telaio; il kit porta la nota
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

    // i pezzi del kit scelto compaiono sotto il telaio
    var box = $("[data-dzt-vis-kit]");
    if (box) {
      var imgs = kit && kit !== "su-misura" && kit.imgs ? kit.imgs.filter(Boolean) : [];
      var chiave = imgs.join("|");
      if (box.getAttribute("data-k") !== chiave) {
        box.setAttribute("data-k", chiave);
        box.innerHTML = "";
        imgs.slice(0, 5).forEach(function (u, i) {
          var s = document.createElement("span"); s.style.setProperty("--i", i);
          var im = document.createElement("img"); im.src = u; im.alt = ""; im.loading = "lazy";
          s.appendChild(im); box.appendChild(s);
        });
        box.hidden = !imgs.length;
      }
    }

    // testi del riepilogo
    var tTelaio = v ? v.t : "—";
    var tKit = "Solo telaio", pKit = "Incluso", cKit = 0;
    if (kit === "su-misura") { tKit = "Preventivo personalizzato"; pKit = "Su richiesta"; }
    else if (kit && kitVar) {
      tKit = kit.titolo + (kit.varianti.length > 1 ? " · " + kitVar.t : "");
      cKit = kitVar.prezzo; pKit = soldi(cKit);
    }
    var tot = (v ? v.prezzo : 0) + cKit;

    $("[data-dzt-v-telaio]").textContent = tTelaio;
    $("[data-dzt-v-kit]").textContent = tKit;
    $("[data-dzt-r-telaio]").textContent = tTelaio;
    $("[data-dzt-r-telaio-p]").textContent = v ? soldi(v.prezzo) : "—";
    $("[data-dzt-r-kit]").textContent = tKit;
    $("[data-dzt-r-kit-p]").textContent = pKit;
    $("[data-dzt-tot]").textContent = soldi(tot);
    $("[data-dzt-tot-nota]").hidden = kit !== "su-misura";
    // col preventivo gia' scelto il pulsante principale fa la stessa cosa: il secondo sparisce
    $("[data-dzt-wa]").hidden = kit === "su-misura";
    $("[data-dzt-prev-nota]").hidden = false;
    $("[data-dzt-tot2]").textContent = soldi(tot);

    var add = $("[data-dzt-add]");
    if (kit === "su-misura") {
      // preventivo: il pulsante apre WhatsApp, anche se il telaio in quella taglia va ordinato
      add.disabled = !v;
      add.textContent = "Chiedi il preventivo";
    } else {
      var ok = v && v.disp && !(kit && (!kitVar || !kitVar.disp));
      add.disabled = !ok;
      add.textContent = ok ? "Aggiungi al carrello" : "Non disponibile";
    }

    // WhatsApp con la configurazione gia' scritta
    var msg = kit === "su-misura"
      ? "Ciao! Vorrei un preventivo personalizzato per montare il " + D.titolo + " (" + tTelaio + ")."
      : "Ciao! Vorrei un preventivo personalizzato partendo dal " + D.titolo + " (" + tTelaio + ").\nPer ora ho scelto: " + tKit + ".";
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
        var id = sel ? +sel.value : kit.scelta;   // numero per i kit prodotto, "c0"... per i kit composti
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

  $("[data-dzt-note]").addEventListener("input", aggiorna);

  /* ---- 3. carrello: telaio con le note per l'officina, e il kit ---- */
  $("[data-dzt-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = variante();
    if (kit === "su-misura") { if (v) window.open($("[data-dzt-wa]").href, "_blank", "noopener"); return; }
    if (!v || !v.disp) return;
    var add = $("[data-dzt-add]"), err = $("[data-dzt-err]");
    var props = {};
    props["Montaggio"] = kit ? kit.titolo + (kit.varianti.length > 1 ? " · " + kitVar.t : "") : "Solo telaio";
    var note = $("[data-dzt-note]").value.trim();
    if (note) props["Note per l'officina"] = note;
    var build = "B" + Date.now().toString(36).toUpperCase();
    props["_Montaggio n."] = build;

    var items = [{ id: v.id, quantity: 1, properties: props }];
    if (kit && kitVar) {
      var suDi = { "Montato su": D.titolo + " · " + v.t, "_Montaggio n.": build };
      if (kit.componenti && kit.componenti.length) {
        // kit composto dal catalogo: nel carrello vanno i componenti veri, segnati col nome del kit
        kit.componenti.forEach(function (cid) {
          items.push({ id: cid, quantity: 1, properties: { "Kit": kit.titolo, "Montato su": suDi["Montato su"], "_Montaggio n.": build } });
        });
      } else {
        items.push({ id: kitVar.id, quantity: 1, properties: suDi });
      }
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
