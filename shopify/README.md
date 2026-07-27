# Migrazione sito Cicli Dal Zilio su Shopify

Materiale di lavoro per portare il nuovo design sul negozio, **senza toccare
il tema in produzione**.

## Stato

| Cosa | Stato |
|---|---|
| Tema pubblicato | `Copia aggiornata di Trade` (Trade, a pagamento) — **intatto** |
| Copia di lavoro | `DZ 2026 — copia di lavoro` (non pubblicata) ✅ creata |
| Analisi varianti | ✅ [`ANALISI-VARIANTI.md`](./ANALISI-VARIANTI.md) |
| Script estrazione | ✅ [`scripts/analizza-varianti.mjs`](./scripts/analizza-varianti.mjs) |
| Sezioni Liquid | ⏳ da scrivere |
| Metafield specifiche | ⏳ da creare |

## Principio di fondo

Il catalogo **non si importa**: i prodotti sono già su Shopify. Il tema legge
da lì. Prezzi, giacenze, varianti e carrello restano gestiti da Shopify, quindi
non ci sono allineamenti da mantenere.

## Ordine dei lavori

### 1. Varianti (bloccante)
Le taglie oggi non esistono come opzione: vedi l'analisi. Finché non è risolto,
selettore taglia, filtri per taglia e disponibilità per misura non funzionano.

```bash
export SHOPIFY_STORE=ciclidalzilio.myshopify.com
export SHOPIFY_TOKEN=shpat_xxx           # token Admin API, permesso read_products
node shopify/scripts/analizza-varianti.mjs > varianti.csv
```

Poi si verifica a mano la colonna `taglia_ipotizzata` e si applica **a lotti**.

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

## Avvertenze

- **Non pubblicare** la copia finché non è verificata: si pubblica da
  *Negozio online → Temi → Pubblica*.
- La ristrutturazione delle varianti tocca i **prodotti reali** e si vede subito
  sul sito pubblicato, indipendentemente dal tema. Farla a lotti.
- Cambiando le varianti cambiano gli **ID variante**: carrelli abbandonati e
  link diretti a una variante smettono di funzionare.
- Sul negozio è attiva un'app di filtri (Globo): va riconfigurata se cambiano
  le opzioni prodotto.
- I dati di anteprima (recensioni, cambi valuta, condizioni di finanziamento)
  sono **dimostrativi** e vanno sostituiti con quelli reali prima di pubblicare.
