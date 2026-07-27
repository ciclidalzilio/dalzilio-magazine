# Regole di sicurezza — non toccare il sito online

Il negozio `ciclidalzilio.com` è **attivo e vende**. Questo documento definisce
cosa si può fare e cosa no durante i lavori sul nuovo design.

## Impronta della produzione (riferimento)

Registrata il **2026-07-27**. Serve a verificare che nulla sia cambiato.

| Elemento | Valore |
|---|---|
| Tema pubblicato | `Copia aggiornata di Trade` |
| ID tema pubblicato | `181191311624` |
| Ultima modifica del tema | `2026-07-18T09:15:17Z` |
| Copia di lavoro | `DZ 2026 — copia di lavoro` (`199574847752`, non pubblicata) |

Controllo automatico:

```bash
node shopify/scripts/verifica-produzione.mjs
```

## Le tre regole

### 1. Sul tema pubblicato non si scrive mai
Ogni modifica va sulla copia `199574847752`. Il tema pubblicato si tocca **solo**
il giorno del passaggio, e solo dal pannello Shopify da parte di una persona.

### 2. I prodotti non sono protetti dalla copia del tema
Prodotti, varianti, prezzi e giacenze sono **condivisi da tutti i temi**.
Modificarli si vede **immediatamente** sul sito online, anche lavorando su una
copia. Vale in particolare per la ristrutturazione delle taglie.

Prima di toccare i prodotti:
- esportare un backup (Prodotti → Esporta → tutti i prodotti, CSV)
- procedere a lotti, una collezione per volta
- evitare gli orari di punta

### 3. Token in sola lettura per l'analisi
Gli script di analisi richiedono solo `read_products`. Se il token ha permessi
di scrittura, lo script avvisa: usare un token dedicato in sola lettura.

## Cosa è già stato fatto (e cosa no)

| Operazione | Fatta? |
|---|---|
| Creata copia non pubblicata del tema | ✅ sì |
| Modificato il tema pubblicato | ❌ no |
| Modificati prodotti, prezzi o giacenze | ❌ no |
| Pubblicata la copia | ❌ no |

## In caso di ripensamento

La copia di lavoro si elimina senza conseguenze dal pannello
(*Negozio online → Temi → ⋯ → Elimina*), oppure via API:

```graphql
mutation { themeDelete(id:"gid://shopify/OnlineStoreTheme/199574847752") { deletedThemeId userErrors { message } } }
```

## Il giorno del passaggio

1. Verificare la copia in anteprima su desktop e mobile
2. Provare un acquisto completo fino al pagamento
3. Esportare un backup dei prodotti
4. Pubblicare dal pannello (non via API)
5. Tenere il tema precedente **non eliminato** per almeno 30 giorni: è il
   ripristino immediato in caso di problemi
