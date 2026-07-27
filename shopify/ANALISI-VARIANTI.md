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

## Schema di arrivo

Due opzioni separate e nomi uniformi in italiano:

| Opzione | Valori |
|---|---|
| `Taglia` | `XXS` `XS` `S` `M` `L` `XL` `XXL` oppure `47` `50` `52` … |
| `Colore` | `Carbon Grey`, `Gelato Blue`, … (senza codici articolo) |

## Come procedere

1. Estrarre l'inventario attuale con `scripts/analizza-varianti.mjs`
2. Controllare a mano la colonna `taglia_ipotizzata` (lo script la deduce dal
   testo, ma va confermata)
3. Applicare le modifiche **a lotti**, partendo da una sola collezione
4. Verificare su tema di anteprima prima di pubblicare

> ⚠️ La ristrutturazione delle varianti tocca i **prodotti reali**, non il tema:
> si vede subito sul sito pubblicato. Va fatta a lotti e in orari di basso traffico.
> Gli ID variante cambiano: eventuali carrelli abbandonati e link diretti a
> varianti smettono di funzionare.
