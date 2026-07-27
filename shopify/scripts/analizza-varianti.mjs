#!/usr/bin/env node
/**
 * Estrae tutte le varianti delle bici e produce un CSV di normalizzazione.
 *
 *   SHOPIFY_STORE=ciclidalzilio.myshopify.com \
 *   SHOPIFY_TOKEN=shpat_xxx \
 *   node shopify/scripts/analizza-varianti.mjs > varianti.csv
 *
 * Lo script è in sola lettura: non modifica nulla.
 * La colonna `taglia_ipotizzata` è dedotta dal testo e va SEMPRE verificata.
 */

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_TOKEN;
const API = "2025-01";

if (!STORE || !TOKEN) {
  console.error("Servono le variabili SHOPIFY_STORE e SHOPIFY_TOKEN.");
  process.exit(1);
}

/** Collezioni bici da analizzare (handle Shopify). */
const COLLEZIONI = ["bici-da-strada", "ebikes", "gravel", "mountain-bike", "urban", "usato-1"];

/** Taglie riconosciute: prima le lettere, poi le misure numeriche dei telai. */
const TAGLIE_LETTERA = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/**
 * Deduce la taglia dal titolo della variante.
 * Cerca prima una taglia a lettere isolata, poi un numero da 44 a 64.
 */
function deduciTaglia(titolo) {
  const t = ` ${String(titolo).toUpperCase().replace(/[\/,()]/g, " ")} `;
  for (const s of [...TAGLIE_LETTERA].sort((a, b) => b.length - a.length)) {
    if (t.includes(` ${s} `)) return s;
  }
  const num = t.match(/\b(4[4-9]|5[0-9]|6[0-4])\b/);
  return num ? num[1] : "";
}

/** Toglie codici articolo, sigle e il nome del modello dal nome colore. */
function pulisciColore(titolo, nomeProdotto = "") {
  let s = String(titolo);
  // via il nome del modello se ripetuto dentro la variante (es. "Bike Foil RC 20 …")
  for (const parola of String(nomeProdotto).split(/\s+/).filter((w) => w.length > 2)) {
    s = s.replace(new RegExp(`\\b${parola.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), " ");
  }
  return s
    .replace(/\bbike\b/gi, "")
    .replace(/\b\d{6,}\b/g, "")
    .replace(/\((EU|IT|DE)\)/gi, "")
    .replace(/\b[A-Z]{4}\b\/?/g, "")
    .replace(/\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/g, "")
    .replace(/\b(4[4-9]|5[0-9]|6[0-4])\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\/\-–]+|[\s\/\-–]+$/g, "")
    .trim();
}

async function gql(query, variables = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const QUERY = `
  query($handle:String!, $cursor:String) {
    collectionByHandle(handle:$handle) {
      products(first:50, after:$cursor) {
        edges { node {
          handle title vendor
          options { name values }
          variants(first:100) { edges { node {
            id title sku inventoryQuantity price
            selectedOptions { name value }
          } } }
        } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }`;

const csv = (v) => {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const righe = [];
const visti = new Set();
let conta = { totale: 0, senzaOpzioni: 0, taglieDedotte: 0, giaOk: 0 };

for (const handle of COLLEZIONI) {
  let cursor = null;
  do {
    const data = await gql(QUERY, { handle, cursor });
    const coll = data.collectionByHandle;
    if (!coll) {
      console.error(`⚠️  collezione non trovata: ${handle}`);
      break;
    }
    for (const { node: p } of coll.products.edges) {
      if (visti.has(p.handle)) continue;
      visti.add(p.handle);

      const nomiOpzioni = p.options.map((o) => o.name);
      const schema = nomiOpzioni.join(" + ") || "—";
      const haTaglia = nomiOpzioni.some((n) => /^(taglia|size)$/i.test(n));
      const soloTitle = schema === "Title";

      conta.totale++;
      if (soloTitle) conta.senzaOpzioni++;
      if (haTaglia) conta.giaOk++;

      for (const { node: v } of p.variants.edges) {
        const optTaglia = v.selectedOptions.find((o) => /^(taglia|size)$/i.test(o.name));
        const optColore = v.selectedOptions.find((o) => /^(colore|color)$/i.test(o.name));
        const dedotta = optTaglia ? optTaglia.value : deduciTaglia(v.title);
        if (!optTaglia && dedotta) conta.taglieDedotte++;

        righe.push([
          p.handle, p.title, p.vendor, schema,
          v.id.split("/").pop(), v.title, v.sku,
          optTaglia ? optTaglia.value : "",
          dedotta,
          optColore ? pulisciColore(optColore.value, p.title) : pulisciColore(v.title, p.title),
          v.price, v.inventoryQuantity,
          soloTitle ? "MANCA_TAGLIA" : optTaglia ? "OK" : "DA_SEPARARE",
        ]);
      }
    }
    cursor = coll.products.pageInfo.hasNextPage ? coll.products.pageInfo.endCursor : null;
  } while (cursor);
}

const intestazione = [
  "handle", "prodotto", "marca", "schema_opzioni",
  "variante_id", "variante_titolo", "sku",
  "taglia_attuale", "taglia_ipotizzata", "colore_pulito",
  "prezzo", "giacenza", "azione",
];

console.log(intestazione.join(";"));
for (const r of righe) console.log(r.map(csv).join(";"));

console.error(
  `\n${conta.totale} prodotti · ${righe.length} varianti\n` +
    `  ${conta.giaOk} già con opzione Taglia\n` +
    `  ${conta.senzaOpzioni} senza alcuna opzione (MANCA_TAGLIA)\n` +
    `  ${conta.taglieDedotte} taglie dedotte dal testo — DA VERIFICARE A MANO\n`
);
