/* DZ 2026 — scheda telaio: il configuratore (stile configuratore d'auto).
   Tiene lo stato delle scelte (variante del telaio, kit, misure), aggiorna la
   foto grande, la barra in basso, il riepilogo e il totale, e aggiunge al
   carrello telaio e kit in un colpo solo.
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
  var pagModo = "tutto";   // "tutto" | "acconto" (solo se esistono i piani d'acconto)
  var misScelte = {};      // kit composto: posizione del pezzo -> variante scelta (es. piega 400/420 x 110)

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
      var sc = $("[data-dzt-scelto]", g);
      if (sc) sc.textContent = scelte[i] || "";
    });

    var disp = $("[data-dzt-disp]");
    if (!v) { disp.textContent = "Questa combinazione non esiste: scegli un'altra taglia o un altro colore."; disp.classList.add("ko"); }
    else if (!v.disp) { disp.textContent = "Esaurito in questa taglia e colore. Scrivici: spesso lo possiamo ordinare."; disp.classList.add("ko"); }
    else { disp.textContent = ""; disp.classList.remove("ko"); }

    if (v) {
      $("[data-dzt-id]").value = v.id;
      if (v.sku) $$("[data-dzt-ref]").forEach(function (r) { r.textContent = v.sku; });
      if (v.img && fotoEl && fotoEl.getAttribute("src") !== v.img) {
        fotoEl.classList.add("cambia");
        var pre = new Image();
        pre.onload = pre.onerror = function () { fotoEl.src = v.img; fotoEl.classList.remove("cambia"); };
        $$("[data-dzt-vista]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-dzt-vista") === v.img); });
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
    var tMis = testoMisure();
    if (kit === "su-misura") { tKit = "Preventivo personalizzato"; pKit = "Su richiesta"; }
    else if (kit && kitVar) {
      tKit = kit.titolo + (kit.varianti.length > 1 ? " · " + kitVar.t : "");
      cKit = kit.componenti ? pezzi().reduce(function (a, x) { return a + x.prezzo; }, 0) : kitVar.prezzo;
      pKit = soldi(cKit);
    }
    var tot = (v ? v.prezzo : 0) + cKit;

    $("[data-dzt-v-telaio]").textContent = tTelaio;
    $("[data-dzt-v-kit]").textContent = tKit;
    $("[data-dzt-v-misure]").textContent = tMis;
    $("[data-dzt-v-misure-riga]").hidden = !tMis;
    $("[data-dzt-r-misure]").textContent = tMis;
    $("[data-dzt-r-misure-riga]").hidden = !tMis;
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

    // acconto: solo se telaio e ogni pezzo del montaggio hanno il loro piano
    var pag = $("[data-dzt-pag]"), accOk = false, oggi = tot;
    if (pag) {
      var pz = kit && kit !== "su-misura" ? (kit.componenti ? pezzi() : [{ prezzo: cKit, piano: kit.piano }]) : [];
      accOk = !!(D.acconto && v && kit !== "su-misura" && pz.every(function (x) { return x.piano; }));
      if (!accOk && pagModo === "acconto") pagModo = "tutto";
      pag.hidden = kit === "su-misura";
      var bAcc = $('[data-dzt-pag-modo="acconto"]', pag);
      bAcc.disabled = !accOk;
      bAcc.title = accOk ? "" : "Per questo montaggio l'acconto non e' disponibile";
      $$("[data-dzt-pag-modo]", pag).forEach(function (x) {
        var on = x.getAttribute("data-dzt-pag-modo") === pagModo; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false");
      });
      var info = $("[data-dzt-pag-info]", pag);
      if (pagModo === "acconto" && accOk) {
        oggi = Math.round(v.prezzo * D.acconto.perc / 100);
        pz.forEach(function (x) { oggi += Math.round(x.prezzo * x.piano.perc / 100); });
        info.innerHTML = "Oggi paghi <b>" + soldi(oggi) + "</b>. Il saldo di " + soldi(tot - oggi) +
          " ti viene addebitato quando telaio e componenti sono arrivati e la bici è pronta.";
        info.hidden = false;
      } else info.hidden = true;
    }
    var bo = $("[data-dzt-bar-oggi]");
    if (bo) bo.textContent = pagModo === "acconto" && accOk ? "oggi " + soldi(oggi) : "";

    var add = $("[data-dzt-add]");
    if (kit === "su-misura") {
      // preventivo: il pulsante apre WhatsApp, anche se il telaio in quella taglia va ordinato
      add.disabled = !v;
      add.textContent = "Chiedi il preventivo";
    } else {
      var ok = v && v.disp && !(kit && (!kitVar || !kitVar.disp));
      add.disabled = !ok;
      add.textContent = !ok ? "Non disponibile" : (pagModo === "acconto" ? "Riserva con acconto" : "Aggiungi al carrello");
    }

    // WhatsApp con la configurazione gia' scritta
    var msg = kit === "su-misura"
      ? "Ciao! Vorrei un preventivo personalizzato per montare il " + D.titolo + " (" + tTelaio + ")."
      : "Ciao! Vorrei un preventivo personalizzato partendo dal " + D.titolo + " (" + tTelaio + ").\nPer ora ho scelto: " + tKit + "." + (tMis ? "\nMisure: " + tMis : "");
    var note = $("[data-dzt-note]").value.trim();
    if (note) msg += "\nNote: " + note;
    $("[data-dzt-wa]").href = "https://wa.me/" + D.wa + "?text=" + encodeURIComponent(msg);
  }

  /* ---- misure dei pezzi del kit composto ----
     Solo le varianti che esistono; quelle esaurite si vedono ma non si scelgono. */
  function misureKit() { return kit && kit !== "su-misura" && kit.misure ? kit.misure : []; }
  // i pezzi del kit con le misure scelte al posto di quelle di partenza
  function pezzi() {
    return kit.componenti.map(function (c, i) {
      var m = misureKit().filter(function (x) { return x.pos === i; })[0];
      if (!m) return c;
      var sc = m.scelte.filter(function (x) { return x.id === misScelte[i]; })[0];
      return sc ? { id: sc.id, prezzo: sc.prezzo, piano: c.piano } : c;
    });
  }
  // etichetta di una variante: solo la parte che cambia tra le varianti (via il colore uguale per tutte)
  function etichetta(m, sc) {
    var parti = sc.t.split(" / ");
    var tenute = parti.filter(function (p, j) {
      return !m.scelte.every(function (x) { return (x.t.split(" / ")[j] || "") === p; });
    });
    var t = (tenute.length ? tenute : parti).join(" · ");
    return t.replace(/(\d+)mm\/(\d+)mm/g, "$1/$2 mm").replace(/(\d)mm/g, "$1 mm").replace(/ x /g, " × ");
  }
  function testoMisure() {
    return misureKit().map(function (m) {
      var sc = m.scelte.filter(function (x) { return x.id === misScelte[m.pos]; })[0];
      return sc ? m.nome + " " + etichetta(m, sc) : "";
    }).filter(Boolean).join(" · ");
  }
  var passoMis = $("[data-dzt-mis-passo]"), boxMis = $("[data-dzt-mis-box]");
  function disegnaMisure() {
    var ms = misureKit();
    boxMis.innerHTML = "";
    ms.forEach(function (m) {
      if (!(m.pos in misScelte)) misScelte[m.pos] = m.scelta;
      var fs = document.createElement("fieldset"); fs.className = "dzt-gruppo";
      var lg = document.createElement("legend"); lg.textContent = m.nome + " "; var sp = document.createElement("span"); sp.textContent = m.pezzo; lg.appendChild(sp); fs.appendChild(lg);
      var box = document.createElement("div"); box.className = "dzt-chips dzt-chips-mis";
      m.scelte.forEach(function (sc) {
        var b = document.createElement("button"); b.type = "button"; b.className = "dzt-chip";
        b.textContent = etichetta(m, sc);
        if (!sc.disp) { b.classList.add("no"); b.disabled = true; b.title = "Esaurita"; }
        var on = misScelte[m.pos] === sc.id; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
        b.addEventListener("click", function () { misScelte[m.pos] = sc.id; disegnaMisure(); aggiorna(); });
        box.appendChild(b);
      });
      fs.appendChild(box); boxMis.appendChild(fs);
    });
    passoMis.hidden = !ms.length;
    var tabMis = $("[data-dzt-tab-misure]");
    if (tabMis) tabMis.hidden = !ms.length;
    $("[data-dzt-num-riep]").textContent = ms.length ? "4" : "3";
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
    misScelte = {};
    disegnaMisure();
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
  $$("[data-dzt-pag-modo]").forEach(function (b) {
    b.addEventListener("click", function () { if (b.disabled) return; pagModo = b.getAttribute("data-dzt-pag-modo"); aggiorna(); });
  });

  /* ---- 3. carrello: telaio con le note per l'officina, e il kit ---- */
  $("[data-dzt-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = variante();
    if (kit === "su-misura") { if (v) window.open($("[data-dzt-wa]").href, "_blank", "noopener"); return; }
    if (!v || !v.disp) return;
    var add = $("[data-dzt-add]"), err = $("[data-dzt-err]");
    var props = {};
    props["Montaggio"] = kit ? kit.titolo + (kit.varianti.length > 1 ? " · " + kitVar.t : "") : "Solo telaio";
    if (testoMisure()) props["Misure"] = testoMisure();
    var note = $("[data-dzt-note]").value.trim();
    if (note) props["Note per l'officina"] = note;
    var build = "B" + Date.now().toString(36).toUpperCase();
    props["_Montaggio n."] = build;

    var acc = pagModo === "acconto";
    if (acc && D.acconto && D.acconto.prova) {
      // anteprima: niente ordine, il piano vero ancora non esiste
      err.textContent = "Questa è un'anteprima: la riserva con acconto sarà attiva quando l'app di preordini avrà creato il piano. Per ora puoi pagare tutto ora o chiederci un preventivo.";
      err.hidden = false;
      return;
    }
    if (acc) props["Pagamento"] = "Acconto " + D.acconto.perc + "%, saldo quando la bici è pronta";
    function conPiano(it, piano) { if (acc && piano) it.selling_plan = piano.id; return it; }
    var items = [conPiano({ id: v.id, quantity: 1, properties: props }, D.acconto)];
    if (kit && kitVar) {
      var suDi = { "Montato su": D.titolo + " · " + v.t, "_Montaggio n.": build };
      if (kit.componenti && kit.componenti.length) {
        // kit composto dal catalogo: nel carrello vanno i componenti veri, segnati col nome del kit
        pezzi().forEach(function (c) {
          items.push(conPiano({ id: c.id, quantity: 1, properties: { "Kit": kit.titolo, "Montato su": suDi["Montato su"], "_Montaggio n.": build } }, c.piano));
        });
      } else {
        items.push(conPiano({ id: kitVar.id, quantity: 1, properties: suDi }, kit.piano));
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

  /* altezza del menu del sito: il telaio e le schede si fermano subito sotto */
  var testa = document.querySelector(".dz header");
  function misuraTesta() { if (testa) root.style.setProperty("--dzt-testa", testa.getBoundingClientRect().height + "px"); }
  misuraTesta();
  addEventListener("resize", misuraTesta);

  /* viste del telaio sotto la foto grande */
  $$("[data-dzt-vista]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!fotoEl) return;
      fotoEl.src = b.getAttribute("data-dzt-vista");
      $$("[data-dzt-vista]").forEach(function (x) { x.classList.toggle("on", x === b); });
    });
  });

  /* schede in cima al pannello: si accende quella del passo che si sta guardando */
  var tabs = $$("[data-dzt-tab] a");
  if (tabs.length && "IntersectionObserver" in window) {
    var visti = {};
    var oss = new IntersectionObserver(function (voci) {
      voci.forEach(function (x) { visti[x.target.id] = x.isIntersecting; });
      var att = tabs.filter(function (t) { return !t.hidden && visti[t.getAttribute("href").slice(1)]; })[0];
      if (att) tabs.forEach(function (t) { t.classList.toggle("on", t === att); });
    }, { rootMargin: "-30% 0px -55% 0px" });
    tabs.forEach(function (t) { var el = document.getElementById(t.getAttribute("href").slice(1)); if (el) oss.observe(el); });
  }

  aggiorna();
})();
