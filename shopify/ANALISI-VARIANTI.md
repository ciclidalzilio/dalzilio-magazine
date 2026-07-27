# Analisi varianti — Cicli Dal Zilio

Rilevata via Admin API il 2026-07-27 sul negozio `ciclidalzilio.com`.

## Il problema

Le opzioni prodotto seguono **5 schemi diversi** (più varianti di maiuscole),
quindi non esiste un modo affidabile per sapere *quale taglia* è disponibile.

### Bici da corsa (69 prodotti)

| Schema opzioni | Prodotti | Quota |
|---|---:|---:|
| `Color` (taglia nascosta nel valore) | 36 | 52% |
| `Taglia` | 21 | 30% |
| `Color` + `Size` | 7 | 10% |
| `Title` (nessuna opzione) | 4 | 6% |
| `Taglia` + `Colore` | 1 | 1% |

### Mountain bike (100 prodotti campionati)

| Schema opzioni | Prodotti | Quota |
|---|---:|---:|
| `Color` (taglia nascosta nel valore) | 77 | 77% |
| `Color` + `Size` | 9 | 9% |
| `Taglia` | 8 | 8% |
| `TAGLIA` (maiuscolo) | 3 | 3% |
| `Title` (nessuna opzione) | 2 | 2% |
| `Taglia` + `Colore` | 1 | 1% |

## Esempi concreti

**Scott Foil RC 20** (`scott-foil-rc-21`) — una sola opzione `Color` con 14 valori:

```
Bike Foil RC 20 (EU) CAGR/M carbon grey M
Bike Foil RC 20 (EU) GBCB/L gelato blue/carbon black L
```

Colore, taglia e codice articolo sono impastati in un'unica stringa.

**Trek Domane SL 6 Gen 4** (`trek-domane-sl-6-gen-4`) — €4.609, opzione `Title`
con un solo valore `Default Title`: **il cliente non può scegliere la taglia**.

## Conseguenze

- Il selettore taglia non ha dati da leggere
- Non si può filtrare il catalogo per taglia
- Non si vede quale misura è in magazzino
- Il confronto tra modelli non può allineare le taglie
- Google Shopping riceve dati incoerenti

## ⚠️ Correzione: NON si ristrutturano le varianti

I metafield del catalogo rivelano un **importatore automatico** (feed FTP
Trek/Scott):

| Metafield | Significato |
|---|---|
| `custom.reference` | codice articolo del fornitore: è la chiave di abbinamento |
| `custom.disable_price_update` | interruttore per non far sovrascrivere il prezzo |
| `custom.availability_expected` | data di riassortimento dal fornitore |
| `custom.brand`, `product_kind`, `frame_material`, `country` | campi del catalogo importato |

**Il feed possiede prodotti, varianti, prezzi e giacenze.** Modificare le
varianti a mano è controproducente:

- alla sincronizzazione successiva le modifiche verrebbero **sovrascritte**
- l'abbinamento per `reference` potrebbe **duplicare** i prodotti
- gli ID variante cambierebbero a ogni ciclo

## La soluzione: si adatta il tema, non i dati

La taglia si ricava **al momento di mostrare la pagina**, leggendo il titolo
della variante. Nessuna modifica al catalogo, feed FTP intatto.

Snippet pronto: [`snippets/taglia-da-variante.liquid`](./snippets/taglia-da-variante.liquid)

Algoritmo (verificato su titoli reali dello store, 8 casi su 8):

1. se il prodotto ha già una vera opzione `Taglia`/`Size` → usa quella
2. altrimenti scorre le parole del titolo **da destra** e prende la prima
   taglia valida (`XXS`–`XXXL` oppure un numero da 44 a 64)
3. `Default Title` non è una taglia → resta vuoto

| Titolo variante | Taglia estratta |
|---|---|
| `Bike Foil RC 20 (EU) CAGR/M carbon grey M` | `M` |
| `Bike Foil RC 20 (EU) GBCB/XXL gelato blue/carbon black XXL` | `XXL` |
| `Deep Smoke` | *(nessuna)* |
| `Default Title` | *(nessuna)* |

### Cosa resta da sistemare alla fonte

I prodotti con opzione `Title` / `Default Title` (una sola variante) **non
contengono proprio l'informazione**: nessun trucco lato tema può inventarla.
Sono il 6% delle bici da corsa e il 2% delle mountain bike.

Vanno affrontati con il fornitore del feed, chiedendo di esportare la taglia
come opzione separata. È l'unica correzione che vale la pena chiedere a monte.

## Lo script di analisi a cosa serve adesso

Non più a preparare una migrazione, ma a **controllare la qualità**: quante
bici hanno la taglia riconoscibile, quante no, e su quali intervenire con il
fornitore.

```bash
node shopify/scripts/analizza-varianti.mjs > varianti.csv
```

La colonna `azione` segnala `MANCA_TAGLIA` per i prodotti da segnalare al feed.
