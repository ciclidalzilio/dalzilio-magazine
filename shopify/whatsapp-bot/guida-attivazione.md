# Guida: bot IA su WhatsApp con lo stesso numero (e risposte anche da iPhone)

Obiettivo: il numero **+39 345 7815102** resta quello di sempre; il bot risponde da solo alle domande frequenti, tu continui a vedere e rispondere a tutto **dall'app WhatsApp Business sull'iPhone**. La funzione di Meta si chiama **Coexistence**.

Tempo stimato: 30–45 minuti. Serve: l'iPhone col numero, una carta per l'abbonamento della piattaforma, accesso alla mail del negozio.

---

## Passo 1 — Crea l'account sulla piattaforma
Consigliata: **Respond.io** (supporto ufficiale alla coesistenza + AI Agent). Alternativa equivalente: **Wati**.

1. Vai su respond.io → Sign up con la mail del negozio (info@ciclidalzilio.com).
2. Scegli il piano base (parti dal piano più economico con l'AI Agent incluso; si cambia quando vuoi).

## Passo 2 — Collega il numero in modalità Coexistence
1. Nel pannello: **Channels → WhatsApp → Connect** e scegli l'opzione **"Use existing WhatsApp Business App number" / Coexistence** (NON "new number").
2. Ti chiederà di collegare l'account **Meta/Facebook Business** del negozio (se non c'è, si crea al volo con la stessa procedura guidata).
3. Comparirà un **QR code**: sull'iPhone apri **WhatsApp Business → Impostazioni → Dispositivi collegati / Collega dispositivo** e inquadra il QR seguendo le istruzioni a schermo.
4. Conferma i consensi. Da questo momento le chat sono sincronizzate: tutto ciò che arriva lo vedi sia sull'iPhone sia nel pannello.

⚠️ Requisiti: app WhatsApp Business aggiornata; il numero deve restare attivo sull'iPhone. Non scollegare il numero dalla piattaforma senza motivo: per riattivare la coesistenza c'è un'attesa di 1–2 mesi.

## Passo 3 — Attiva l'assistente IA
1. Nel pannello: sezione **AI / AI Agent**.
2. Crea un nuovo agente e incolla nel campo istruzioni/knowledge il contenuto del file **`knowledge-base-bot.md`** (è in questa stessa cartella: prima le "Istruzioni per l'assistente", poi la "Conoscenza del negozio").
3. Imposta la regola di ingaggio: l'agente risponde a **tutte le nuove conversazioni in arrivo**.
4. Imposta il **passaggio a umano** (handover): quando l'agente non sa rispondere, quando il cliente chiede un operatore, o sulle parole tipo "prezzo", "sconto", "permuta", "valutazione", "ordine". Alla presa in carico da parte tua, il bot si ferma su quella chat.

## Passo 4 — Prova
1. Da un altro telefono scrivi al 345 7815102: "Che orari fate?" → deve rispondere il bot con gli orari giusti.
2. Chiedi "quanto mi valutate la mia bici?" → il bot deve chiedere foto/modello/anno e passarti la chat.
3. Rispondi tu dall'iPhone in una chat: verifica che il bot non si sovrapponga.

## Passo 5 — Rifiniture consigliate
- **Messaggio di benvenuto** (prima risposta automatica): "Ciao! Sono l'assistente di Cicli Dal Zilio 🤖 — dimmi pure, e se serve ti passo subito i ragazzi del negozio."
- **Fuori orario**: aggiungi al messaggio l'avviso che in negozio si risponde negli orari di apertura.
- Durante le ferie di Ferragosto, aggiungi temporaneamente alle istruzioni del bot: "Il negozio è chiuso nella settimana di Ferragosto: gli ordini possono subire ritardi."

---

## Cose che il bot NON deve mai fare (già scritte nelle sue istruzioni)
- Inventare prezzi, sconti, disponibilità di taglie o tempi di consegna.
- Trattare sul prezzo o valutare permute: sempre passaggio a umano.
- Parlare di argomenti estranei al negozio.

## Quando è attivo, dimmelo
Posso prepararti anche: le risposte rapide multilingua (en/de/fr), i template per le campagne (es. lancio Pinarello), e l'aggiornamento periodico della knowledge base quando cambiano orari, promo o catalogo.
