# Migrazione sito Cicli Dal Zilio su Shopify

Materiale di lavoro per portare il nuovo design sul negozio, **senza toccare
il tema in produzione**.

## Stato

| Cosa | Stato |
|---|---|
| Tema pubblicato | `Copia aggiornata di Trade` (Trade, a pagamento) — **intatto** |
| Copia di lavoro | `DZ 2026 — copia di lavoro` (non pubblicata) ✅ creata |
| Regole di sicurezza | ✅ [`SICUREZZA.md`](./SICUREZZA.md) |
| Analisi varianti | ✅ [`ANALISI-VARIANTI.md`](./ANALISI-VARIANTI.md) |
| Script estrazione | ✅ [`scripts/analizza-varianti.mjs`](./scripts/analizza-varianti.mjs) |
| Snippet taglia (senza toccare i dati) | ✅ [`snippets/taglia-da-variante.liquid`](./snippets/taglia-da-variante.liquid) |
| Sezioni Liquid | ⏳ da scrivere |
| Metafield specifiche | ⏳ da creare |

## Principio di fondo

Il catalogo **non si importa**: i prodotti sono già su Shopify. Il tema legge
da lì. Prezzi, giacenze, varianti e carrello restano gestiti da Shopify, quindi
non ci sono allineamenti da mantenere.

## Ordine dei lavori

### 1. Taglie — si risolve nel tema, non nei dati
Il catalogo Trek/Scott arriva da un **feed automatico**: prodotti, varianti,
prezzi e giacenze sono suoi. Non si toccano a mano, altrimenti la
sincronizzazione le sovrascrive.

La taglia si ricava dal titolo della variante al momento di mostrare la pagina:
snippet pronto in [`snippets/taglia-da-variante.liquid`](./snippets/taglia-da-variante.liquid).

```bash
export SHOPIFY_STORE=ciclidalzilio.myshopify.com
export SHOPIFY_TOKEN=shpat_xxx           # token Admin API, permesso read_products
node shopify/scripts/analizza-varianti.mjs > varianti.csv
```

Serve a controllare la qualità dei dati, non a modificarli: la colonna `azione`
segnala i prodotti senza taglia riconoscibile, da segnalare al fornitore del feed.

### 2. Metafield per le specifiche
Peso, rapporti, gruppo e ruote oggi stanno dentro l'HTML della descrizione.
Servono come metafield per usarli in scheda, confronto e filtri:

| Namespace | Chiave | Tipo |
|---|---|---|
| `specs` | `peso_kg` | `number_decimal` |
| `specs` | `rapporti` | `number_integer` |
| `specs` | `gruppo` | `single_line_text_field` |
| `specs` | `ruote` | `single_line_text_field` |
| `specs` | `telaio` | `single_line_text_field` |

### 3. Sezioni del tema
Da portare in Liquid sulla copia di lavoro:

- Vetrina prodotto (galleria con rail verticale + zoom)
- Colonna acquisto sticky con calcolatore rata (TAN 6,5%, 6–60 mesi)
- Selettore taglia con tabelle della casa madre
- Confronto tra modelli (fino a 3)
- Sezione "Perché comprarla da noi"
- Usato e permuta a distanza
- Bottone WhatsApp con messaggi precompilati

### 4. Funzioni da app, non da tema

| Funzione | Soluzione |
|---|---|
| Paese, lingua, valuta | **Shopify Markets** (nativo) |
| Recensioni | Judge.me oppure Loox |
| Feed Instagram | Instafeed |

## Verifica che la produzione sia intatta

```bash
node shopify/scripts/verifica-produzione.mjs
```

Controlla che il tema pubblicato sia ancora quello giusto e non modificato, e
che la copia di lavoro non sia stata pubblicata per errore. Esce con errore se
qualcosa è cambiato. Dettagli in [`SICUREZZA.md`](./SICUREZZA.md).

## Avvertenze

- **Non pubblicare** la copia finché non è verificata: si pubblica da
  *Negozio online → Temi → Pubblica*.
- **Non modificare prodotti, varianti, prezzi o giacenze**: sono gestiti dal
  feed FTP Trek/Scott. Qualsiasi modifica manuale viene sovrascritta alla
  sincronizzazione successiva e può duplicare i prodotti.
- Il metafield `custom.disable_price_update` esiste proprio per escludere un
  prodotto dagli aggiornamenti di prezzo del feed: non toccarlo alla cieca.
- Sul negozio è attiva un'app di filtri (Globo): va riconfigurata se cambiano
  le opzioni prodotto.
- I dati di anteprima (recensioni, cambi valuta, condizioni di finanziamento)
  sono **dimostrativi** e vanno sostituiti con quelli reali prima di pubblicare.
