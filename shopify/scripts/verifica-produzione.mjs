#!/usr/bin/env node
/**
 * Controlla che il sito online non sia stato toccato.
 *
 *   SHOPIFY_STORE=ciclidalzilio.myshopify.com \
 *   SHOPIFY_TOKEN=shpat_xxx \
 *   node shopify/scripts/verifica-produzione.mjs
 *
 * Esce con codice 1 se qualcosa è cambiato rispetto all'impronta registrata.
 * Sola lettura: non modifica nulla.
 */

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_TOKEN;
const API = "2025-01";

/** Impronta registrata il 2026-07-27 — vedi SICUREZZA.md */
const ATTESO = {
  temaPubblicatoId: "181191311624",
  temaPubblicatoNome: "Copia aggiornata di Trade",
  temaPubblicatoAggiornato: "2026-07-18T09:15:17Z",
  copiaLavoroId: "199574847752",
};

if (!STORE || !TOKEN) {
  console.error("Servono le variabili SHOPIFY_STORE e SHOPIFY_TOKEN.");
  process.exit(1);
}

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const ko = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`  \x1b[33m•\x1b[0m ${m}`);

async function chiamata(path, opts = {}) {
  const res = await fetch(`https://${STORE}/admin/api/${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${path}`);
  return res.json();
}

const gql = async (query) => {
  const j = await chiamata("/graphql.json", { method: "POST", body: JSON.stringify({ query }) });
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
};

let problemi = 0;

console.log("\nControllo produzione — " + STORE + "\n");

/* 1. Permessi del token: meglio se è in sola lettura. */
try {
  const { access_scopes: scopes = [] } = await chiamata("/oauth/access_scopes.json").catch(() => ({}));
  const scritture = scopes.map((s) => s.handle).filter((h) => h.startsWith("write_"));
  if (!scopes.length) info("permessi del token non leggibili (normale per token di app)");
  else if (scritture.length) info(`il token ha ${scritture.length} permessi di scrittura: ${scritture.slice(0, 4).join(", ")}…`);
  else ok("token in sola lettura");
} catch {
  info("permessi del token non verificabili");
}

/* 2. Il tema pubblicato deve essere ancora quello, e non modificato. */
const dati = await gql(`{
  main: themes(first:5, roles:[MAIN]) { edges { node { id name updatedAt } } }
  tutti: themes(first:30) { edges { node { id name role } } }
}`);

const main = dati.main.edges[0]?.node;
if (!main) {
  ko("nessun tema pubblicato trovato");
  problemi++;
} else {
  const id = main.id.split("/").pop();
  if (id === ATTESO.temaPubblicatoId) ok(`tema pubblicato invariato: ${main.name}`);
  else {
    ko(`il tema pubblicato è CAMBIATO: ora è "${main.name}" (${id}), atteso ${ATTESO.temaPubblicatoId}`);
    problemi++;
  }
  if (main.updatedAt === ATTESO.temaPubblicatoAggiornato) ok(`tema pubblicato non modificato (${main.updatedAt})`);
  else {
    ko(`il tema pubblicato è stato MODIFICATO: ${main.updatedAt} invece di ${ATTESO.temaPubblicatoAggiornato}`);
    problemi++;
  }
}

/* 3. La copia di lavoro non deve essere pubblicata. */
const copia = dati.tutti.edges.map((e) => e.node).find((t) => t.id.split("/").pop() === ATTESO.copiaLavoroId);
if (!copia) info("copia di lavoro non trovata (eliminata?)");
else if (copia.role === "MAIN") {
  ko("ATTENZIONE: la copia di lavoro risulta PUBBLICATA");
  problemi++;
} else ok(`copia di lavoro non pubblicata (${copia.role.toLowerCase()})`);

console.log(
  problemi === 0
    ? "\n\x1b[32mTutto in ordine: il sito online non è stato toccato.\x1b[0m\n"
    : `\n\x1b[31m${problemi} anomalie da controllare.\x1b[0m\n`
);
process.exit(problemi === 0 ? 0 : 1);
