# dsmenu.it – menu digitali dei locali

Ogni locale ha il suo indirizzo fisso: `https://www.dsmenu.it/<nome-locale>` (è quello nel QR code).

**I menu NON stanno in questo repository.** Piatti, prezzi, allergeni e dati del locale
si gestiscono dal gestionale (Supabase, migrazione 026): qui ci sono solo i temi grafici.

- `api/menu.js` – riceve `/<nome-locale>`, legge da Supabase la versione **pubblicata**
  (`menu_public`) e la mostra con il tema scelto. Le pagine restano in cache circa 1 minuto:
  una modifica pubblicata è online entro un minuto.
- `/anteprima/<token>` – anteprima di una bozza (link segreto, mai in cache, non indicizzata).
- `themes/mdc-XXX.html` – i temi (gli stessi modelli di dsfabio.com). Dei modelli si usano
  la grafica e il codice: piatti, intestazione e piè di pagina vengono sostituiti con i dati del locale.
  I temi mdc-005 … mdc-015 si rigenerano dai modelli con `python3 tools/prepara_temi.py ../dsfabio`
  (mdc-014 = Fuoco & Brace, mdc-015 = Sakura Neon): toglie i dati di fantasia e mette i segnaposto.
- `assets/fonts`, `assets/vendor`, `favicon.svg` – caratteri, librerie e icona usati dai temi.

Stati di una pagina:
| Situazione | Cosa vede chi inquadra il QR |
| --- | --- |
| menu pubblicato e abbonamento attivo o in prova | il menu |
| abbonamento sospeso | "menu momentaneamente non disponibile" (torna da solo al pagamento) |
| menu creato ma non ancora pubblicato | "menu in preparazione" |
| vecchio indirizzo dopo un cambio nome | rimando permanente al nuovo indirizzo |
| indirizzo inesistente | pagina "menu non trovato" (404) |

Sicurezza: tutti i testi vengono resi innocui prima di essere inseriti nella pagina; il sito usa
solo la chiave pubblica di Supabase, che può leggere esclusivamente i menu pubblicati.

Facoltativo su Vercel: `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (altrimenti usa quelle del gestionale).
