// =====================================================================
// dsmenu.it/<nome-locale>  →  menu del locale, preso dal gestionale.
// Legge da Supabase la versione PUBBLICATA (funzione menu_public) e la
// mostra con il tema scelto (themes/mdc-XXX.html). Nessun dato del menu
// sta in questo repository: si modifica solo dal gestionale.
//   /<slug>               menu pubblicato (in cache ~1 minuto)
//   /anteprima/<token>    anteprima di una bozza (link segreto, mai in cache)
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xzhbyxvlrxemujrqatbl.supabase.co';
// chiave pubblica (publishable): può stare qui, i dati sono protetti dal database
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_sfam2xLCQig0550kvfkUdg_yGaU0IA_';
// stesso indirizzo della home, della sitemap e del materiale (dsmenu.it/nomelocale): un solo dominio per Google
const SITE = 'https://dsmenu.it';
const THEMES = new Set(Array.from({ length: 21 }, (_, i) => `mdc-${String(i + 1).padStart(3, '0')}`));
// temi preparati con tools/prepara_temi.py: dati e intestazione tramite segnaposto
const PLACEHOLDER_THEMES = new Set(['mdc-002', 'mdc-005', 'mdc-006', 'mdc-007', 'mdc-008', 'mdc-009', 'mdc-010',
  'mdc-011', 'mdc-012', 'mdc-013', 'mdc-014', 'mdc-015',
  'mdc-016', 'mdc-017', 'mdc-018', 'mdc-019', 'mdc-020', 'mdc-021']);
// temi animati con i piatti illustrati di assets/piatti.js (Aura, Il Focolare, Vesuvio,
// La Piadaia, Zucchero Velo, The Copper Fox): stessi dati, disegno scelto dal nome del piatto
// Bella Napoli, Ice Lounge e Smash Lab rifatti (tools/nuovi_modelli.py) usano la stessa forma dei dati
const ILLUSTRATED_THEMES = new Set(['mdc-002', 'mdc-009', 'mdc-010', 'mdc-016', 'mdc-017', 'mdc-018', 'mdc-019', 'mdc-020', 'mdc-021']);
const DEFAULT_THEME = 'mdc-001';
const ALLERGENS = new Set(['glutine', 'crostacei', 'uova', 'pesce', 'arachidi', 'soia', 'latte',
  'frutta', 'sedano', 'senape', 'sesamo', 'solfiti', 'lupini', 'molluschi']);

// ---------- utilità ----------
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const bold = (v) => esc(v).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const digits = (v) => String(v || '').replace(/[^\d+]/g, '');

const cache = new Map();
function theme(name) {
  if (!cache.has(name)) cache.set(name, fs.readFileSync(path.join(process.cwd(), 'themes', `${name}.html`), 'utf8'));
  return cache.get(name);
}

async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  return r.json();
}

// ---------- dai dati del gestionale al formato dei temi ----------
// Tutti i testi vengono "puliti" qui: i temi li inseriscono così come sono nella pagina.
// ---------- foto dei piatti (migrazione 033) ----------
// Solo dal contenitore "menu-photos" del nostro Supabase. Nei temi con l'emoji del
// piatto la foto ne prende il posto; negli altri va sopra la descrizione.
const PHOTO_RE = new RegExp(`^${SUPABASE_URL.replace(/[.]/g, '\\.')}/storage/v1/object/public/menu-photos/[0-9a-f-]{36}/[A-Za-z0-9_-]{6,40}\\.(webp|jpg|jpeg|png)$`);
const PHOTO_IN_DESC = new Set(['mdc-001', 'mdc-004', 'mdc-005', 'mdc-012']);
const photoOk = (u) => typeof u === 'string' && PHOTO_RE.test(u);
// logo del locale (migrazione 046 del gestionale): stessa cartella delle foto
// tondo con l'anello colorato, come la foto profilo nelle storie di Instagram
const STORY_RING = 'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)';
const logoImg = (u, size) => (photoOk(u)
  ? `<span class="dsm-logo" style="display:inline-block;box-sizing:border-box;width:${size};height:${size};aspect-ratio:1;padding:3px;border-radius:50%;background:${STORY_RING};flex:0 0 auto;vertical-align:middle"><img src="${esc(u)}" alt="Logo" decoding="async" style="display:block;box-sizing:border-box;width:100%;height:100%;border-radius:50%;object-fit:cover;background:#fff"></span>`
  : '');
const MONO_LOGO = '100%';
// slogan sotto il nome: al massimo 60 caratteri (come nel gestionale), così non riempie la copertina
const slogan = (t) => { const v = String(t || '').replace(/\s+/g, ' ').trim(); return v.length <= 60 ? v : `${v.slice(0, 59).replace(/\s+\S*$/, '')}…`; };
// tondo con l'iniziale finché il logo non c'è (stesso anello del logo)
const monoRing = (ch) => `<span class="dsm-logo dsm-mono" aria-hidden="true" style="display:inline-block;box-sizing:border-box;width:100%;height:100%;padding:3px;border-radius:50%;background:${STORY_RING};vertical-align:middle"><span style="display:grid;place-items:center;width:100%;height:100%;box-sizing:border-box;border-radius:50%;border:3px solid #fff;background:#fffbf2;color:#2a1b14;font:700 2.1rem/1 Georgia,'Times New Roman',serif">${esc(ch)}</span></span>`;
const initial = (r) => (r.info?.monogram || String(r.name || '?').trim().replace(/^the\s+/i, '').charAt(0).toUpperCase() || '?');
// tondo in alto al centro della copertina: logo intero dentro al tondo, o l'iniziale
const hdLogo = (r) => logoImg(r.info?.logo, '100%') || monoRing(initial(r));
const photoImg = (u, alt, cls) => `<img class="${cls}" src="${esc(u)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
const PHOTO_CSS = `<style>
img.dsm-ph{width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;max-width:none}
.pic{position:relative;overflow:hidden}.pic>img.dsm-ph{position:absolute;inset:0}
img.dsm-ph-big{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:12px;margin:6px 0 10px}
</style>`;
// etichette dei piatti (migrazione 060 del gestionale): accanto al nome, colorate in tutti i modelli;
// "esaurito" rende il piatto sbiadito
const FLAG_INFO = { esaurito: 'Esaurito', novita: 'Novità', offerta: 'In offerta', consigliato: 'Consigliato', stagione: 'Di stagione' };
const flagsHtml = (it) => (Array.isArray(it?.flags) ? it.flags : []).filter((k) => FLAG_INFO[k]).slice(0, 4)
  .map((k) => ` <span class="dsm-flag dsm-f-${k}${k === 'esaurito' ? ' dsm-so' : ''}">${FLAG_INFO[k]}</span>`).join('');
const hasFlags = (data) => (data?.sections || []).some((s) => (s.items || []).some((i) => flagsHtml(i)));
const FLAG_CSS = `<style>
.dsm-flag{display:inline-block;vertical-align:middle;margin:0 0 0 6px;padding:2px 8px;border-radius:999px;font:700 .62em/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.02em;color:#fff;white-space:nowrap;text-transform:none;font-style:normal;-webkit-text-fill-color:#fff;text-shadow:none}
.dsm-f-esaurito{background:#6b7280}.dsm-f-novita{background:#7c3aed}.dsm-f-offerta{background:#16a34a}
.dsm-f-consigliato{background:#2563eb}.dsm-f-stagione{background:#ea580c}
:is(article,li,button,.card,.item,.it,.dish):has(.dsm-so):not(:has(:is(article,li,button,.card,.item,.it,.dish) .dsm-so)){opacity:.55;filter:grayscale(.7)}
</style>`;
const hasPhotos = (data) => (data?.sections || []).some((s) => (s.items || []).some((i) => photoOk(i.photo)));

function toTheme(name, data) {
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const DIET = { veg: 'Vegetariano', vegan: 'Vegano' };
  const MENU = sections.map((s) => {
    const sec = { id: esc(s.id), t: esc(s.title), s: esc(s.subtitle || ''), e: esc(s.emoji || ''),
                  da: num(s.from, 0), a: num(s.to, 24), items: [] };
    sec.items = (Array.isArray(s.items) ? s.items : []).map((it) => {
      const labels = (Array.isArray(it.labels) ? it.labels : []).map(esc);
      const o = { n: esc(it.name) + flagsHtml(it), d: esc(it.description || ''), p: num(it.price, 0),
                  a: (Array.isArray(it.allergens) ? it.allergens : []).filter((x) => ALLERGENS.has(x)),
                  e: esc(it.emoji || '') };
      if (name === 'mdc-001') o.t = [...(DIET[it.diet] ? [DIET[it.diet]] : []), ...labels];
      if (name === 'mdc-002') o.t = [...(it.diet ? ['veg'] : []), ...(it.spicy ? ['hot'] : []), ...(it.new ? ['new'] : [])];
      if (name === 'mdc-003') { if (it.diet === 'vegan') o.vg = 1; else if (it.diet === 'veg') o.v = 1; }
      if (name === 'mdc-004') o.t = labels[0] || '';
      if (photoOk(it.photo)) {
        if (PHOTO_IN_DESC.has(name)) o.d = photoImg(it.photo, it.name, 'dsm-ph-big') + o.d;
        else o.e = photoImg(it.photo, it.name, 'dsm-ph');
      }
      return o;
    });
    return sec;
  });
  const t = data?.extras?.tasting;
  const TASTING = t && t.after
    ? { after: esc(t.after), t: esc(t.title), items: (t.items || []).map(esc), p: num(t.price, 0), note: esc(t.note || '') }
    : { after: '\u0000nessuno', t: '', items: [], p: 0, note: '' };
  const NOTE = data?.extras?.note ? bold(data.extras.note) : '';
  return { MENU, TASTING, NOTE };
}

// ---------- intestazione e piè di pagina ----------
function header(name, r) {
  // copertina uguale in tutti i modelli: tondo del logo, nome, slogan (vedi tools/copertina.mjs)
  const info = r.info || {};
  const n = esc(r.name);
  let h1 = n;
  if (name === 'mdc-004') {
    const w = String(r.name || '').trim().split(/\s+/);
    if (w.length > 1) h1 = `${esc(w.slice(0, -1).join(' '))}<br><span>${esc(w[w.length - 1])}</span>`;
  }
  const cls = name === 'mdc-001' ? 'hero' : 'top';
  return `<header class="${cls} dsm-hdr">
<div class="dsm-hd"><span class="dsm-hd-logo">${hdLogo(r)}</span><h1>${h1}</h1>${slogan(info.tagline) ? `<p>${esc(slogan(info.tagline))}</p>` : ''}</div>
</header>`;
}

const ICON = {
  fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.1 23.7v-8H6.6V12h2.5v-1.6c0-4.1 1.9-6 5.9-6l1.6.1v3.3h-1.3c-1.6 0-2.1.6-2.1 2.1V12h3.3l-.6 3.7h-2.7v8a12 12 0 1 0-4.1 0z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none"/></svg>',
  tt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 2h-3.3v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.3 6.3 0 1 0 5.3 6.2V8.6a8 8 0 0 0 4.4 1.4V6.7a4.6 4.6 0 0 1-4.4-4.7z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.8 4.9-1.3A9.9 9.9 0 1 0 12.04 2zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a17 17 0 0 1-1.7-.6 13.4 13.4 0 0 1-5.1-4.5c-.4-.5-1.3-1.7-1.3-3.3s.8-2.3 1.1-2.6c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2.1 1.3 2.4 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.4z"/></svg>',
};

// link del footer: "#" = segnaposto (link non ancora fornito dal locale): icona visibile, nessuna apertura
const fLink = (u) => (u === '#' ? 'href="#"' : `href="${esc(u)}" target="_blank" rel="noopener"`);

// ---------- testi del piè di pagina nella lingua del menu (lingua del cliente, migrazione 076) ----------
const LANGS = ['it', 'en', 'es', 'pt', 'de', 'fr'];
const menuLang = (r) => (LANGS.includes(r?.lang) ? r.lang : 'it');
const FOOT = {
  it: { tel: 'Tel.', call: '📞 Chiama', where: '📍 Dove siamo', review: '⭐ Lascia una recensione', web: '🌐 Sito web', contacts: 'Contatti', vat: 'P.IVA',
    al: '<b>⚠️ Allergeni</b> (Reg. UE 1169/2011): gli allergeni sono indicati per ogni piatto. Se hai allergie o intolleranze alimentari chiedi sempre al personale prima di ordinare: i piatti possono contenere tracce di altri allergeni per contaminazione durante la preparazione.',
    by: 'Menu digitale by', want: 'Lo vuoi per il tuo locale?', privacy: 'Privacy',
    desc: (n, c) => `Il menu di ${n}${c ? ` a ${c}` : ''}: piatti, prezzi e allergeni sempre aggiornati.` },
  en: { tel: 'Tel.', call: '📞 Call', where: '📍 Find us', review: '⭐ Leave a review', web: '🌐 Website', contacts: 'Contacts', vat: 'VAT',
    al: '<b>⚠️ Allergens</b> (EU Reg. 1169/2011): allergens are shown for every dish. If you have food allergies or intolerances, always ask the staff before ordering: dishes may contain traces of other allergens due to cross-contamination during preparation.',
    by: 'Digital menu by', want: 'Want one for your venue?', privacy: 'Privacy',
    desc: (n, c) => `The menu of ${n}${c ? ` in ${c}` : ''}: dishes, prices and allergens always up to date.` },
  es: { tel: 'Tel.', call: '📞 Llamar', where: '📍 Dónde estamos', review: '⭐ Deja una reseña', web: '🌐 Sitio web', contacts: 'Contactos', vat: 'NIF/IVA',
    al: '<b>⚠️ Alérgenos</b> (Reg. UE 1169/2011): los alérgenos se indican en cada plato. Si tienes alergias o intolerancias alimentarias, pregunta siempre al personal antes de pedir: los platos pueden contener trazas de otros alérgenos por contaminación durante la preparación.',
    by: 'Menú digital by', want: '¿Lo quieres para tu local?', privacy: 'Privacidad',
    desc: (n, c) => `El menú de ${n}${c ? ` en ${c}` : ''}: platos, precios y alérgenos siempre actualizados.` },
  pt: { tel: 'Tel.', call: '📞 Ligar', where: '📍 Onde estamos', review: '⭐ Deixe uma avaliação', web: '🌐 Site', contacts: 'Contactos', vat: 'NIF',
    al: '<b>⚠️ Alergénios</b> (Reg. UE 1169/2011): os alergénios estão indicados em cada prato. Se tem alergias ou intolerâncias alimentares, pergunte sempre ao pessoal antes de pedir: os pratos podem conter vestígios de outros alergénios por contaminação durante a preparação.',
    by: 'Menu digital by', want: 'Quer um para o seu estabelecimento?', privacy: 'Privacidade',
    desc: (n, c) => `O menu de ${n}${c ? ` em ${c}` : ''}: pratos, preços e alergénios sempre atualizados.` },
  de: { tel: 'Tel.', call: '📞 Anrufen', where: '📍 So findest du uns', review: '⭐ Bewertung schreiben', web: '🌐 Website', contacts: 'Kontakt', vat: 'USt-IdNr.',
    al: '<b>⚠️ Allergene</b> (VO (EU) 1169/2011): Die Allergene sind bei jedem Gericht angegeben. Bei Lebensmittelallergien oder -unverträglichkeiten frag bitte immer vor der Bestellung beim Personal nach: Die Gerichte können durch die Zubereitung Spuren anderer Allergene enthalten.',
    by: 'Digitale Speisekarte by', want: 'Willst du eine für dein Lokal?', privacy: 'Datenschutz',
    desc: (n, c) => `Die Speisekarte von ${n}${c ? ` in ${c}` : ''}: Gerichte, Preise und Allergene immer aktuell.` },
  fr: { tel: 'Tél.', call: '📞 Appeler', where: '📍 Nous trouver', review: '⭐ Laisser un avis', web: '🌐 Site web', contacts: 'Contacts', vat: 'TVA',
    al: '<b>⚠️ Allergènes</b> (Règl. UE 1169/2011) : les allergènes sont indiqués pour chaque plat. En cas d’allergies ou d’intolérances alimentaires, demandez toujours au personnel avant de commander : les plats peuvent contenir des traces d’autres allergènes par contamination lors de la préparation.',
    by: 'Menu digital by', want: 'Vous le voulez pour votre établissement ?', privacy: 'Confidentialité',
    desc: (n, c) => `Le menu de ${n}${c ? ` à ${c}` : ''} : plats, prix et allergènes toujours à jour.` },
};
// la pubblicità in fondo al menu porta alla home di dsmenu.it nella stessa lingua
const adUrl = (lang, slug) => `https://dsmenu.it/${lang === 'it' ? '' : lang}?utm_source=dsmenu&amp;utm_medium=menu&amp;utm_campaign=${encodeURIComponent(slug || '')}`;

// dicitura sugli allergeni: sempre in fondo a ogni menu, con qualsiasi modello
const allergenNotice = (t) => '<p class="fallergeni" role="note" style="max-width:600px;margin:16px auto 0;padding-top:12px;'
  + 'border-top:1px solid currentColor;border-top-color:rgba(127,127,127,.35);font-size:.78rem;line-height:1.5;opacity:.88">' + t.al + '</p>';

function footer(r) {
  const i = r.info || {};
  const lang = menuLang(r), t = FOOT[lang];
  const line = [i.address, i.phone ? `${t.tel} ${i.phone}` : '', i.hours].filter(Boolean).map(esc).join(' · ');
  const wa = digits(i.whatsapp).replace('+', '');
  const mapsUrl = i.maps && i.maps !== '#' ? i.maps
    : i.address ? `https://maps.google.com/?q=${encodeURIComponent([i.address, r.city].filter(Boolean).join(', '))}` : i.maps;
  const soc = [
    i.facebook && `<a class="fb" ${fLink(i.facebook)} aria-label="Facebook">${ICON.fb}</a>`,
    i.instagram && `<a class="ig" ${fLink(i.instagram)} aria-label="Instagram">${ICON.ig}</a>`,
    i.tiktok && `<a class="tt" ${fLink(i.tiktok)} aria-label="TikTok">${ICON.tt}</a>`,
    wa && `<a class="wa" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>`,
  ].filter(Boolean).join('');
  const links = [
    i.phone && `<a href="tel:${esc(digits(i.phone))}">${t.call}</a>`,
    mapsUrl && `<a ${fLink(mapsUrl)}>${t.where}</a>`,
    i.reviews && `<a ${fLink(i.reviews)}>${t.review}</a>`,
    i.website && `<a ${fLink(i.website)}>${t.web}</a>`,
  ].filter(Boolean).join('');
  // la firma "Menu digitale by DS Service" è sempre l'ultima riga in basso
  return `<footer>
  ${i.logo && photoOk(i.logo) ? `<div style="margin:0 auto 12px">${logoImg(i.logo, '92px')}</div>` : ''}
  <strong>${esc(r.name)}</strong>
  ${line ? `<div class="finfo">${line}</div>` : ''}
  ${i.vat ? `<div class="fvat" style="font-size:.8em;opacity:.8;margin-top:6px">${t.vat} ${esc(String(i.vat).replace(/^IT/i, '').replace(/\s+/g, ''))}</div>` : ''}
  ${soc ? `<div class="soc">${soc}</div>` : ''}${links ? `<nav class="flinks" aria-label="${t.contacts}">${links}</nav>` : ''}
  ${allergenNotice(t)}
  <small class="fby" style="display:block;margin-top:14px;opacity:.75">${t.by} <a href="${adUrl(lang, r.slug)}" target="_blank" rel="noopener">DS Service</a> · <a href="${adUrl(lang, r.slug)}" target="_blank" rel="noopener">${t.want}</a> · <a href="https://dsfabio.com/${lang === 'it' ? '' : lang + '/'}privacy#menu" target="_blank" rel="noopener">${t.privacy}</a></small>
</footer>`;
}

// ---------- temi mdc-005 … mdc-021 (segnaposto) ----------
const AL_JS = "{glutine:['🌾','Glutine'],crostacei:['🦐','Crostacei'],uova:['🥚','Uova'],pesce:['🐟','Pesce'],arachidi:['🥜','Arachidi'],soia:['🫘','Soia'],latte:['🥛','Latte'],frutta:['🌰','Frutta a guscio'],sedano:['🥬','Sedano'],senape:['🟡','Senape'],sesamo:['⚪','Sesamo'],solfiti:['🍷','Solfiti'],lupini:['🌼','Lupini'],molluschi:['🐚','Molluschi']}";
const HIGHLIGHT = /consigl|speciali|chef|\btop\b|più (scelt|amat|chiest|vendut)|signature|best/i;
const DRINK_SECTION = /cocktail|drink|spritz|aperitiv|vin[io]|bevand|bibit|bere|birr|distillat|gin|rum|whisk|analcolic|zero|signature|classici|sake|long/i;
const LIQ = ['#7fe3ff', '#ff7a2f', '#2f8cff', '#ff4d6d', '#9bd13a', '#c58bff'];
// piatto senza emoji: quella della sezione, altrimenti una neutra
const DEFAULT_EMOJI = { 'mdc-009': '🍸' };

/** Dati del gestionale → forma comune, con tutti i testi già "puliti". */
function normalize(name, data) {
  const fallback = DEFAULT_EMOJI[name] || '🍽️';
  return (Array.isArray(data?.sections) ? data.sections : []).map((s, si) => {
    const sec = { id: `s-${String(s.id || si).replace(/[^A-Za-z0-9_-]/g, '')}`, title: esc(s.title), TITLE: esc(String(s.title || '').toUpperCase()), sub: esc(s.subtitle || ''),
                  emoji: esc(s.emoji || '') };
    sec.items = (Array.isArray(s.items) ? s.items : []).map((it) => {
      const labels = (Array.isArray(it.labels) ? it.labels : []).map(String);
      return {
        n: esc(it.name) + flagsHtml(it), d: esc(it.description || ''), p: num(it.price, 0),
        a: (Array.isArray(it.allergens) ? it.allergens : []).filter((x) => ALLERGENS.has(x)),
        e: esc(it.emoji || s.emoji || fallback),
        veg: it.diet === 'veg' || it.diet === 'vegan', hot: !!it.spicy, isNew: !!it.new,
        top: labels.some((l) => HIGHLIGHT.test(l)), label: esc(labels[0] || ''), LABEL: esc((labels[0] || '').toUpperCase()),
        dPlain: esc(it.description || ''),
        emo: esc(it.emoji || s.emoji || fallback), ph: photoOk(it.photo) ? it.photo : '',
        ...(photoOk(it.photo) ? (PHOTO_IN_DESC.has(name)
          ? { d: photoImg(it.photo, it.name, 'dsm-ph-big') + esc(it.description || '') }
          : { e: photoImg(it.photo, it.name, 'dsm-ph') }) : {}),
      };
    });
    return sec;
  });
}

const tagList = (it, keys) => keys.filter((k) => ({ hot: it.hot, veg: it.veg, top: it.top, new: it.isNew })[k]);

function themeData(name, S) {
  const v = (n, val) => `var ${n} = ${json(val)};\n`;
  const base = (it, extra = {}) => ({ n: it.n, d: it.d, p: it.p, a: it.a, ...extra });
  const out = { js: '', css: '', vars: {} };
  switch (name) {
    case 'mdc-005':
      out.js = `var AL = ${AL_JS};\nvar GIORNI = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];\nvar LAVAGNA = [[],[],[],[],[],[],[]];\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: s.title, s: s.sub, items: s.items.map((it) => base(it, it.top ? { star: 1 } : {})) })));
      break;
    case 'mdc-006':
      out.js = `var AL = ${AL_JS};\nvar PESCATO = [];\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: s.title, s: s.sub, items: s.items.map((it) => base(it, { e: it.e, ...(it.top ? { t: 'top' } : {}) })) })));
      break;
    case 'mdc-007': {
      const views = {};
      S.forEach((s) => { views[s.id] = [{ id: s.id, t: s.title, items: s.items.map((it) => base(it, { e: it.e, t: it.label || (it.top ? 'Top' : it.veg ? 'Veg' : '') })) }]; });
      out.js = `var AL = ${AL_JS};\nvar SIZES = ['', '', ''];\nvar STYLES = {};\nvar BIRRE = [];\n`
        + v('DSM_VIEWS', views) + v('DSM_START', S[0]?.id || '');
      out.vars.TABS = S.map((s, i) => `<button role="tab" data-v="${s.id}" aria-selected="${i === 0}">${s.emoji ? `${s.emoji} ` : ''}${s.title}</button>`).join('\n  ');
      break;
    }
    case 'mdc-008':
      out.js = `var AL = ${AL_JS};\nvar TAGS = {hot:'Piccante', veg:'Veg', top:'Consigliata'};\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: s.title, s: s.sub, items: s.items.map((it) => base(it, { e: it.e, t: tagList(it, ['hot', 'veg', 'top']) })) })));
      break;
    case 'mdc-011':
      out.js = `var AL = ${AL_JS};\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: s.title, s: s.sub, items: s.items.map((it) => base(it, { e: it.e, h: it.hot ? 3 : 0, t: it.label || (it.top ? 'Il più scelto' : it.veg ? 'Veg' : '') })) })));
      if (!S.some((s) => s.items.some((it) => it.hot))) out.css = '.spice,.chilis{display:none!important}';
      break;
    case 'mdc-012':
      out.js = `var AL = ${AL_JS};\nvar TAGS = {veg:'Veg', top:'La più chiesta', hot:'Piccante'};\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: s.title, s: s.sub, items: s.items.map((it) => base(it, { t: tagList(it, ['veg', 'top']) })) })))
        + "var IMPASTI = [['', 0]];\nvar FORMATI = [['', 0]];\nvar RIPIENI = [];\n";
      break;
    case 'mdc-013':
      out.js = `var AL = ${AL_JS};\nvar FORMATI = [['🥙','Panino']];\nvar FORMATI_D = [''];\nvar TAGS = {hot:'Piccante', veg:'Veg', top:'Il più scelto'};\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: s.title, s: s.sub, items: s.items.map((it) => base(it, { e: it.e, t: tagList(it, ['hot', 'veg', 'top']) })) })));
      break;
    case 'mdc-014':
      out.js = `const AL = ${AL_JS};\nconst TAGS = {veg:'🌱 Veg', hot:'🌶 Piccante', new:'✨ Novità'};\n`
        + `const MENU = ${json(S.map((s) => ({ id: s.id, label: s.title, e: s.emoji || '🍽️', items: s.items.map((it) => base(it, { e: it.e, t: tagList(it, ['veg', 'hot', 'new']), ...(it.top ? { top: 1 } : {}) })) })))};\n`;
      if (!S.some((s) => s.items.some((it) => it.top))) out.css = '.specials{display:none!important}';
      break;
    case 'mdc-015':
      out.js = `const CATS = ${json(S.map((s) => ({ id: s.id, e: s.emoji || '🍽️', l: { it: s.title, en: s.title }, s: { it: s.sub, en: s.sub },
        items: s.items.map((it, i) => ({ e: it.e, h: (i * 47 + 330) % 360, n: { it: it.n, en: it.n }, d: { it: it.d, en: it.d }, p: it.p, a: it.a, t: tagList(it, ['top', 'hot', 'veg', 'new']) })) })))};\n`;
      break;
    default:
      if (ILLUSTRATED_THEMES.has(name)) {
        // forma comune dei temi animati: il disegno del piatto lo sceglie assets/piatti.js
        out.js = v('M', S.map((s) => ({ n: s.title, s: s.sub, e: s.emoji, items: s.items.map((it) => ({
          n: it.n, d: it.dPlain, p: it.p, al: it.a, e: it.emo,
          ...(it.ph ? { ph: it.ph } : {}), ...(it.label ? { lb: it.label } : {}),
          ...(it.top ? { top: 1 } : {}), ...(it.hot ? { hot: 1 } : {}), ...(it.veg ? { veg: 1 } : {}), ...(it.isNew ? { isNew: 1 } : {}),
        })) })));
      }
  }
  return out;
}

function fillTheme(name, r, h) {
  const info = r.info || {};
  const S = normalize(name, r.data);
  const firstEmoji = (r.data?.sections || []).flatMap((s) => [s.emoji, ...(s.items || []).map((i) => i.emoji)]).find(Boolean);
  const { js, css, vars } = themeData(name, S);
  const words = String(r.name || '').trim().split(/\s+/).filter(Boolean);
  const values = {
    NAME: esc(r.name),
    NAME_A: esc(words.length > 1 ? words.slice(0, -1).join(' ') : words.join(' ')),
    NAME_B: esc(words.length > 1 ? ` ${words[words.length - 1]}` : ''),
    KICKER: esc(info.kicker || ''),
    TAGLINE: esc(slogan(info.tagline)),
    HOURS: esc(info.hours || ''),
    HERO_EMOJI: esc(firstEmoji || '🍽️'),
    HDLOGO: hdLogo(r),
    NOTE: r.data?.extras?.note ? bold(r.data.extras.note) : '',
    MONO: logoImg(info.logo, MONO_LOGO) || esc(info.monogram || String(r.name || '?').trim().charAt(0).toUpperCase()),
    // tema Aura: il tondo in alto c'è sempre, con il logo oppure con l'iniziale del locale finché il logo non c'è
    LOGO: logoImg(info.logo, '76px') || `<span class="dsm-logo dsm-mono" aria-hidden="true" style="display:inline-block;box-sizing:border-box;width:76px;height:76px;padding:3px;border-radius:50%;background:${STORY_RING};vertical-align:middle"><span style="display:grid;place-items:center;width:100%;height:100%;box-sizing:border-box;border-radius:50%;border:3px solid #fff;background:#fffbf2;color:#424e1d;font:600 2rem/1 'Fraunces',Georgia,serif">${esc(info.monogram || String(r.name || '?').trim().charAt(0).toUpperCase())}</span></span>`,
    MARQUEE: `${Array(2).fill(S.map((s) => s.TITLE).join(' ✦ ')).join(' ✦ ')} ✦&nbsp;`,
    // scritta che gira attorno al piatto (tema Aura)
    RING: esc(Array(3).fill(String(info.kicker || r.name || '').toUpperCase()).join(' · ') + ' ·'),
    TITLE_LINES: words.map((w) => `<span class="line${w === '&' ? ' amp' : ''}" aria-hidden="true">${esc(w)}</span>`).join(''),
    ...vars,
  };
  // elementi facoltativi: spariscono se il dato manca
  h = h.replace(/<(\w+)([^>]*?) data-dsm-opt="([A-Z_]+)">([\s\S]*?)<\/\1>/g,
    (m, tag, attrs, key, inner) => (values[key] ? `<${tag}${attrs}>${inner}</${tag}>` : ''));
  h = h.replace(/__DSM_([A-Z_]+?)__/g, (m, key) => (key in values ? values[key] : ''));
  h = h.replace('/*DSM:DATA*/', () => `/* dati del menu: dal gestionale */\n${js}`);
  if (name === 'mdc-015') h = h.replace('/* dati del menu: dal gestionale */', () => `/* dati del menu: dal gestionale */\nconst DSM_TAG = ${json(values.TAGLINE || values.KICKER)};`);
  if (css) h = h.replace('</head>', () => `<style>${css}</style>\n</head>`);
  return h;
}

// ---------- logo e copertina nell'intestazione (tutti i modelli) ----------
// Tabella condivisa con dsfabio/attiva.html (anteprima nel modulo): tenerle uguali.
//  at    intestazione (tag.classe) dietro cui va la copertina
//  rgb,a velo sopra la foto: colore del modello e opacità (0.40 = 40%: la foto si vede, il testo resta leggibile)
//  tx    'dk' testo chiaro su velo scuro, 'lt' testo scuro su velo chiaro: ombra/alone dietro ai testi
//  css   ritocchi del modello quando c'è la copertina
// La copertina è uguale in tutti i modelli (tools/copertina.mjs): tondo del logo in alto al centro, nome, slogan.
const BRAND_LOOK = {
  'mdc-001': { at: 'header.hero', rgb: '250,246,238', a: 0.52, tx: 'lt' },
  'mdc-002': { at: 'header.hero', rgb: '16,40,90', a: 0.36, tx: 'dk' },
  'mdc-003': { at: 'header.top', rgb: '255,250,242', a: 0.52, tx: 'lt' },
  'mdc-004': { at: 'header.top', rgb: '18,18,20', a: 0.4, tx: 'dk' },
  'mdc-005': { at: 'header.top', rgb: '52,32,20', a: 0.4, tx: 'dk' },
  'mdc-006': { at: 'header.top', rgb: '12,52,104', a: 0.36, tx: 'dk' },
  'mdc-007': { at: 'header.top', rgb: '18,16,14', a: 0.4, tx: 'dk' },
  'mdc-008': { at: 'header.hero', rgb: '18,10,8', a: 0.4, tx: 'dk' },
  'mdc-009': { at: 'header.hero', rgb: '8,12,28', a: 0.42, tx: 'dk' },
  'mdc-010': { at: 'header.hero', rgb: '17,17,17', a: 0.36, tx: 'dk' },
  'mdc-011': { at: 'header.hero', rgb: '14,14,14', a: 0.4, tx: 'dk' },
  'mdc-012': { at: 'header.hero', rgb: '250,240,222', a: 0.52, tx: 'lt' },
  'mdc-013': { at: 'header.hero', rgb: '12,26,62', a: 0.4, tx: 'dk' },
  'mdc-014': { at: 'header.hero', rgb: '16,34,26', a: 0.38, tx: 'dk' },
  'mdc-015': { at: 'header.top', rgb: '30,12,54', a: 0.4, tx: 'dk', h1: false },
  'mdc-016': { at: 'header.hero', rgb: '52,62,22', a: 0.4, tx: 'dk' },
  'mdc-017': { at: 'header.top', rgb: '40,22,12', a: 0.36, tx: 'dk' },
  'mdc-018': { at: 'header.hero', rgb: '20,14,12', a: 0.32, tx: 'dk' },
  'mdc-019': { at: 'header.hero', rgb: '250,243,228', a: 0.5, tx: 'lt' },
  'mdc-020': { at: 'header.hero', rgb: '253,238,242', a: 0.48, tx: 'lt' },
  'mdc-021': { at: 'header.wall', rgb: '16,10,8', a: 0.4, tx: 'dk' },
};
const BRAND_CSS = '<style>:where(.dsm-cov){position:relative}.dsm-cov{isolation:isolate}'
  // foto + velo; in basso sfuma nello sfondo del modello, così non c'è uno stacco netto
  + '.dsm-cov>.dsm-cov-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;'
  + 'background:linear-gradient(var(--dsm-tint),var(--dsm-tint)),var(--dsm-cover) center center/cover no-repeat;'
  + '-webkit-mask-image:linear-gradient(180deg,#000 0,#000 60%,rgba(0,0,0,.55) 80%,rgba(0,0,0,.15) 92%,transparent 100%);mask-image:linear-gradient(180deg,#000 0,#000 60%,rgba(0,0,0,.55) 80%,rgba(0,0,0,.15) 92%,transparent 100%)}'
  // con la copertina la testata non ha più un suo sfondo: la foto sfuma direttamente nello sfondo della pagina del modello
  + '.dsm-cov{background:transparent!important;background-image:none!important;box-shadow:none!important}.dsm-cov::before,.dsm-cov::after{display:none!important}'
  + '.dsm-cov .dsm-hd{padding-bottom:130px!important}@media (max-width:600px){.dsm-cov .dsm-hd{padding-bottom:112px!important}}'
  // testi sempre leggibili sulla foto
  + '.dsm-cov-dk p,.dsm-cov-dk small,.dsm-cov-dk .kick,.dsm-cov-dk .kicker,.dsm-cov-dk .est{text-shadow:0 1px 3px rgba(0,0,0,.6),0 2px 16px rgba(0,0,0,.45)}'
  + ':where(.dsm-cov-dk:not(.dsm-cov-noh1)) h1{text-shadow:0 2px 4px rgba(0,0,0,.35),0 4px 24px rgba(0,0,0,.45)}'
  + '.dsm-cov-lt p,.dsm-cov-lt small,.dsm-cov-lt .kick,.dsm-cov-lt .kicker{text-shadow:0 0 2px rgba(255,255,255,.9),0 0 14px rgba(255,255,255,.85)}'
  + ':where(.dsm-cov-lt:not(.dsm-cov-noh1)) h1{text-shadow:0 0 18px rgba(255,255,255,.85)}'
  + '</style>';

// apertura del primo elemento "tag.classe" (o "tag") dopo la posizione from
function findTag(h, sel, from = 0) {
  const [tag, cls] = sel.split('.');
  const re = new RegExp(cls ? `<${tag}\\b[^>]*\\bclass="[^"]*\\b${cls}\\b[^"]*"[^>]*>` : `<${tag}\\b[^>]*>`, 'g');
  re.lastIndex = from;
  return re.exec(h);
}

function brandHeader(name, info, h) {
  const cfg = BRAND_LOOK[name];
  const cover = cfg && photoOk(info.cover) ? info.cover : null;
  if (!cover) return h;
  const m = findTag(h, cfg.at);
  if (!m) return h;
  const open = m[0].replace(/class="([^"]*)"/, (x, c) => `class="${c} dsm-cov dsm-cov-${cfg.tx}${cfg.h1 === false ? ' dsm-cov-noh1' : ''}"`)
    .replace(/>$/, ` style="--dsm-tint:rgba(${cfg.rgb},${cfg.a});--dsm-cover:url(&quot;${esc(cover)}&quot;)">`);
  h = h.slice(0, m.index) + open + '<span class="dsm-cov-bg" aria-hidden="true"></span>' + h.slice(m.index + m[0].length);
  return h.replace('</head>', () => `${BRAND_CSS}${cfg.css ? `<style>${cfg.css}</style>` : ''}\n</head>`);
}

// ---------- pagina del menu ----------
// Visite: ogni telefono conta una volta al giorno per menu (la pagina è in cache,
// quindi il conteggio parte dal telefono e non dal server). Niente dati personali.
function viewBeacon(slug) {
  return `<script>(function(){try{var k='dsm-v-'+${json(slug)}+'-'+new Date().toISOString().slice(0,10);if(localStorage.getItem(k))return;localStorage.setItem(k,'1')}catch(e){}
if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent||''))return;
setTimeout(function(){try{fetch(${json(SUPABASE_URL)}+'/rest/v1/rpc/menu_view_hit',{method:'POST',keepalive:true,headers:{apikey:${json(SUPABASE_KEY)},'Content-Type':'application/json'},body:JSON.stringify({p_slug:${json(slug)}})}).catch(function(){})}catch(e){}},1500)})();</script>\n`;
}

// ---------- dati strutturati per Google (schema.org): il locale e il suo menu ----------
// Solo dati già visibili nella pagina; prezzi in euro come nei temi; i piatti esauriti restano fuori.
function structuredData(r, url) {
  const i = r.info || {};
  const ok = (u) => typeof u === 'string' && /^https:\/\//.test(u);
  const txt = (v) => String(v ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const sections = (Array.isArray(r.data?.sections) ? r.data.sections : []).map((s) => ({
    '@type': 'MenuSection',
    name: txt(s.title),
    hasMenuItem: (Array.isArray(s.items) ? s.items : [])
      .filter((it) => txt(it.name) && !(Array.isArray(it.flags) && it.flags.includes('esaurito')))
      .map((it) => ({
        '@type': 'MenuItem',
        name: txt(it.name),
        ...(txt(it.description) ? { description: txt(it.description) } : {}),
        ...(num(it.price, 0) > 0 ? { offers: { '@type': 'Offer', price: num(it.price, 0).toFixed(2), priceCurrency: 'EUR' } } : {}),
        ...(it.diet === 'vegan' ? { suitableForDiet: 'https://schema.org/VeganDiet' } : it.diet === 'veg' ? { suitableForDiet: 'https://schema.org/VegetarianDiet' } : {}),
      })),
  })).filter((s) => s.name && s.hasMenuItem.length);
  const sameAs = [i.facebook, i.instagram, i.tiktok, i.website].filter(ok);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    '@id': `${url}#locale`,
    name: txt(r.name),
    url,
    ...(photoOk(i.logo) ? { image: i.logo, logo: i.logo } : {}),
    ...(txt(i.phone) ? { telephone: txt(i.phone) } : {}),
    ...(txt(i.address) || txt(r.city) ? { address: { '@type': 'PostalAddress', ...(txt(i.address) ? { streetAddress: txt(i.address) } : {}), ...(txt(r.city) ? { addressLocality: txt(r.city) } : {}) } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    hasMenu: { '@type': 'Menu', url, inLanguage: menuLang(r), ...(sections.length ? { hasMenuSection: sections } : {}) },
  };
  return `<script type="application/ld+json">${json(ld)}</script>\n`;
}

function render(r, { preview = false } = {}) {
  const name = THEMES.has(r.theme) ? r.theme : DEFAULT_THEME;
  let h = theme(name);
  const placeholders = PLACEHOLDER_THEMES.has(name);
  const { MENU, TASTING, NOTE } = placeholders ? {} : toTheme(name, r.data);
  if (hasPhotos(r.data)) h = h.replace('</head>', () => `${PHOTO_CSS}\n</head>`);
  if (hasFlags(r.data)) h = h.replace('</head>', () => `${FLAG_CSS}\n</head>`);
  const url = `${SITE}/${r.slug}`;
  const title = `${r.name} · Menu${r.city ? ` · ${r.city}` : ''}`;
  const desc = [r.info?.tagline, FOOT[menuLang(r)].desc(r.name, r.city)]
    .filter(Boolean).join(' · ');

  if (placeholders) {
    h = fillTheme(name, r, h);
  } else {
    // dati: sostituisce solo i piatti, tiene legenda allergeni e filtri del tema
    h = h.replace(/var MENU = \[[\s\S]*?\n\];/, () => `var MENU = ${json(MENU)};`)
         .replace(/var TASTING = \{.*\};/, () => `var TASTING = ${json(TASTING)};`)
         .replace(/var NOTE = '.*';/, () => `var NOTE = ${json(NOTE)};`);
  }

  // testa della pagina
  h = h.replace(/<meta name="robots"[^>]*>/, preview ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">')
       .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`)
       .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${esc(desc)}">`)
       .replace(/<meta property="og:site_name"[^>]*>/, '<meta property="og:site_name" content="dsmenu.it">')
       .replace(/<meta property="og:title"[^>]*>/, () => `<meta property="og:title" content="${esc(title)}">`)
       .replace(/<meta property="og:description"[^>]*>/, () => `<meta property="og:description" content="${esc(desc)}">`)
       .replace(/<meta property="og:url"[^>]*>/, () => `<meta property="og:url" content="${esc(url)}">\n<link rel="canonical" href="${esc(url)}">`)
       .replace(/<meta property="og:image(:width|:height)?"[^>]*>\n?/g, '')
       .replace(/<meta name="twitter:card"[^>]*>/, '<meta name="twitter:card" content="summary">')
       .replace(/(href|src)="(assets\/|favicon\.svg)/g, '$1="/$2');

  // niente componenti di vendita dei modelli dimostrativi
  h = h.replace(/<script[^>]*src="\/?assets\/trial\.js"[^>]*><\/script>\n?/g, '');
  if (placeholders && preview) {
    h = h.replace(/<body([^>]*)>/, (m) => `${m}\n<div style="position:sticky;top:0;z-index:2147483000;background:#c2410c;color:#fff;text-align:center;font:600 13px/1.3 system-ui,sans-serif;padding:8px 12px">ANTEPRIMA · versione ${esc(r.version)} non ancora pubblicata</div>`);
  }
  h = h.replace(/<div class="demo">[\s\S]*?<\/div>/, preview
    ? `<div class="demo">ANTEPRIMA · versione ${esc(r.version)} non ancora pubblicata</div>` : '');

  if (!placeholders) h = h.replace(/<header[\s\S]*?<\/header>/, () => header(name, r));
  h = h.replace(/<footer>[\s\S]*?<\/footer>/, () => footer(r));
  // lingua della pagina = lingua del menu (il browser non propone traduzioni sbagliate)
  h = h.replace(/<html lang="it"/i, `<html lang="${menuLang(r)}"`);
  h = brandHeader(name, r.info || {}, h);
  if (!preview) h = h.replace('</head>', () => `${structuredData(r, url)}</head>`);
  if (!preview) h = h.replace(/<\/body>/i, () => `${viewBeacon(r.slug)}</body>`);
  return h;
}

// ---------- menu in pausa (abbonamento sospeso) ----------
// Un assaggio del menu sfocato sotto un messaggio gentile; il titolare può
// riattivarlo da qui: codice cliente → pagamento → torna online da solo.
function pausedPage(r) {
  let h;
  try {
    h = render(r);
  } catch {
    return simplePage(`${r.name}`, 'Il menu digitale è momentaneamente in pausa. Chiedi pure al personale: ti aspettiamo!', 200).html;
  }
  const n = esc(r.name);
  const contact = /^[^@\s<>"]+@[^@\s<>"]+$/.test(String(r.contact || '')) ? r.contact : 'info@dsfabio.com';
  const overlay = `
<style>
html,body{overflow:hidden!important;height:100%!important}
body>*:not(#dsm-pause){filter:blur(7px) saturate(.8);pointer-events:none!important;user-select:none!important}
#dsm-pause{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;
  background:rgba(250,246,238,.55);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#2b2420;
  -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);overflow:auto}
#dsm-pause *{box-sizing:border-box;text-shadow:none;font-family:inherit;text-transform:none;letter-spacing:normal;-webkit-text-stroke:0;filter:none;opacity:1;transform:none;animation:none;visibility:visible}
#dsm-pause *::before,#dsm-pause *::after{content:none!important}
#dsm-pause .dsm-card{width:100%;max-width:400px;background:#fffdf9;border-radius:22px;padding:28px 24px 22px;text-align:center;
  box-shadow:0 18px 50px rgba(43,36,32,.22),0 2px 6px rgba(43,36,32,.08)}
#dsm-pause .ico{width:56px;height:56px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;background:#f3ebdd;font-size:26px}
#dsm-pause h1{font-size:1.35rem;line-height:1.25;margin:0 0 8px;font-weight:700;letter-spacing:-.01em;color:#2b2420;background:none;padding:0}
#dsm-pause p{margin:0;color:#6b5f57;display:block;-webkit-line-clamp:unset;overflow:visible}
#dsm-pause .sep{height:1px;background:#eee4d6;margin:20px 0 16px}
#dsm-pause .own{font-size:.93rem}
#dsm-pause button,#dsm-pause input{font:inherit}
#dsm-pause .btn{display:block;width:100%;margin-top:12px;border:0;border-radius:12px;padding:13px 16px;font-weight:700;cursor:pointer;
  background:#2b2420;color:#fff}
#dsm-pause .btn:disabled{opacity:.6;cursor:default}
#dsm-pause .link{background:none;border:0;color:#8a5a2b;font-weight:600;text-decoration:underline;cursor:pointer;padding:4px}
#dsm-pause form{margin-top:12px;text-align:left}
#dsm-pause label{display:block;font-size:.85rem;font-weight:600;margin-bottom:6px}
#dsm-pause input{width:100%;box-sizing:border-box;border:1.5px solid #ddd0bf;border-radius:12px;padding:12px 14px;font-size:1.1rem;
  letter-spacing:.12em;text-transform:uppercase;background:#fff;color:#2b2420}
#dsm-pause input:focus{outline:none;border-color:#8a5a2b;box-shadow:0 0 0 3px rgba(138,90,43,.15)}
#dsm-pause .hint{font-size:.8rem;color:#8b7f76;margin-top:6px}
#dsm-pause .hello{font-weight:700;color:#8a5a2b;margin-bottom:4px!important}
#dsm-pause .lead{margin:0 0 14px!important}
#dsm-pause form h1,#dsm-pause #dsm-renew h1{text-align:left}
#dsm-pause .back{display:block;margin:12px auto 0;font-weight:500;color:#8b7f76;position:static;backface-visibility:visible;-webkit-backface-visibility:visible;background:none;padding:4px;width:auto;height:auto;inset:auto}
#dsm-pause .perks{list-style:none;padding:0;margin:0 0 16px;display:grid;gap:8px}
#dsm-pause .perks li{position:relative;padding-left:28px;color:#4b403a;font-size:.95rem;line-height:1.4}
#dsm-pause .perks li::before{content:"✓"!important;position:absolute;left:0;top:0;width:20px;height:20px;border-radius:50%;background:#e7f6ec;color:#1f7a3a;font-weight:800;font-size:12px;display:grid;place-items:center}
#dsm-pause .price{color:#2b2420;text-align:center;border:1.5px solid #eadfce;border-radius:14px;padding:12px;margin-bottom:4px;background:#fffaf2}
#dsm-pause .price b{font-size:1.9rem;color:#2b2420}
#dsm-pause .price span{color:#6b5f57}
#dsm-pause .price small{display:block;color:#8a5a2b;font-weight:600;font-size:.85rem;margin-top:2px}
#dsm-pause .btn-go{background:#1f7a3a;font-size:1.05rem;padding:15px 16px}
#dsm-pause .trust{text-align:center;margin-top:10px}
#dsm-pause #dsm-renew{text-align:left}
#dsm-pause a.btn{text-decoration:none;text-align:center;box-sizing:border-box}
#dsm-pause .err{color:#b42318;font-size:.88rem;margin-top:8px}
#dsm-pause .ok{color:#1f7a3a;font-size:.88rem;margin-top:8px}
#dsm-pause .by{margin-top:18px;font-size:.75rem;color:#a0948a}
#dsm-pause .by a{color:inherit}
#dsm-pause p.own a{color:#8a5a2b;font-weight:700}
</style>
<div id="dsm-pause" role="dialog" aria-modal="true" aria-labelledby="dsm-pause-t">
  <div class="dsm-card">
    <div class="ico" aria-hidden="true" id="dsm-ico">🍽️</div>
    <div id="dsm-guest">
      <h1 id="dsm-pause-t">${r.ended ? 'Il menu digitale non è più attivo' : 'Il menu digitale è in pausa'}</h1>
      <p>Il menu di <strong>${n}</strong> ${r.ended ? 'non è più disponibile online' : 'al momento non è disponibile online'}. Chiedi pure al personale: sarà felice di aiutarti!</p>
      <div class="sep"></div>
      ${r.service
        // pausa per un problema del servizio: niente pagamento, il titolare contatta l'assistenza
        ? `<p class="own">Sei il titolare? Per riattivarlo contatta l'assistenza: <a href="mailto:${esc(contact)}">${esc(contact)}</a></p>`
        : r.ended
          // disdetta: niente richiesta di pagamento in vista, ma il titolare può ripartire quando vuole
          ? '<button type="button" class="link" id="dsm-open">Sei il titolare e vuoi riattivarlo?</button>'
          : '<button type="button" class="link" id="dsm-open">Sei il titolare? Area riservata</button>'}
    </div>
    <div class="own">
      <form id="dsm-form" hidden novalidate>
        <h1>Area titolare</h1>
        <p class="lead">Inserisci il codice cliente per riattivare il menu di <strong>${n}</strong>.</p>
        <label for="dsm-code">Codice cliente</label>
        <input id="dsm-code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" required>
        <div class="hint">Lo trovi sulla scheda cliente che ti abbiamo consegnato.</div>
        <div class="err" id="dsm-err" role="alert" hidden></div>
        <button type="submit" class="btn" id="dsm-go">Continua</button>
        <button type="button" class="link back" id="dsm-back">← Torna indietro</button>
      </form>
      <div id="dsm-renew" hidden>
        <p class="hello" id="dsm-hello"></p>
        <h1>Riattiva il tuo menu in un minuto</h1>
        <p class="lead" id="dsm-why"></p>
        <ul class="perks">
          <li><b>Torna online subito</b>, appena il pagamento è confermato</li>
          <li><b>Stessi QR sui tavoli</b>: niente da ristampare</li>
          <li><b>Piatti, prezzi e foto salvati</b>: ritrovi tutto com'era</li>
          <li><b>Aggiornamenti del menu inclusi</b> per tutto l'anno</li>
        </ul>
        <div class="price" id="dsm-price" hidden><b id="dsm-price-y"></b><span> / anno</span><small id="dsm-price-m"></small></div>
        <a class="btn btn-go" id="dsm-pay" href="#">Riattiva ora il menu</a>
        <div class="hint trust">🔒 Pagamento sicuro con Stripe · ricevuta via email</div>
      </div>
    </div>
    <div class="by">Menu digitale by <a href="https://dsfabio.com" target="_blank" rel="noopener">DS Service</a> · <a href="https://dsfabio.com/assistenza" target="_blank" rel="noopener">Assistenza</a></div>
  </div>
</div>
<script>
(function () {
  var SLUG = ${json(r.slug)}, SB = ${json(SUPABASE_URL)}, KEY = ${json(SUPABASE_KEY)};
  var $ = function (id) { return document.getElementById(id); };
  Array.prototype.forEach.call(document.body.children, function (el) {
    if (el.id !== 'dsm-pause' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') { el.setAttribute('aria-hidden', 'true'); el.inert = true; }
  });
  if (!$('dsm-open')) return; // pausa per un problema del servizio: nessuna area titolare
  // il messaggio per i clienti del locale resta solo nella prima schermata
  $('dsm-open').addEventListener('click', function () {
    $('dsm-guest').hidden = true; $('dsm-ico').textContent = '🔑'; $('dsm-form').hidden = false; $('dsm-code').focus();
  });
  $('dsm-back').addEventListener('click', function () {
    $('dsm-form').hidden = true; $('dsm-guest').hidden = false; $('dsm-ico').textContent = '🍽️'; err('');
  });
  function err(t) { var e = $('dsm-err'); e.textContent = t || ''; e.hidden = !t; }
  $('dsm-form').addEventListener('submit', function (ev) {
    ev.preventDefault(); err('');
    var code = $('dsm-code').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (code.length < 6) return err('Inserisci il codice cliente.');
    var b = $('dsm-go'); b.disabled = true; b.textContent = 'Un attimo…';
    function reset() { b.disabled = false; b.textContent = 'Continua'; }
    fetch(SB + '/rest/v1/rpc/menu_reactivate', {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: SLUG, p_code: code })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok && d.pay_url) {
        // solo ora, con il codice giusto, si parla di scadenza e pagamento
        $('dsm-form').hidden = true; $('dsm-renew').hidden = false; $('dsm-ico').textContent = '🚀';
        $('dsm-hello').textContent = 'Ciao' + (d.name ? ' ' + d.name : '') + '!';
        $('dsm-why').textContent = 'Il menu di ' + (d.business || 'questo locale') + ' è in pausa'
          + (d.expired ? ' dal ' + d.expired : '') + ': in questo momento i tuoi clienti al tavolo non lo vedono.';
        $('dsm-pay').href = d.pay_url;
        var cents = d.price ? Math.round(parseFloat(String(d.price).replace(/[^0-9,]/g, '').replace(',', '.')) * 100) : 0;
        if (cents > 0) {
          var eur = function (c) { return (c / 100).toFixed(2).replace('.', ',').replace(',00', '') + ' €'; };
          $('dsm-price-y').textContent = eur(cents);
          var day = Math.ceil(cents / 365);
          $('dsm-price-m').textContent = 'meno di ' + (day < 100 ? day + ' centesimi' : eur(day)) + ' al giorno';
          $('dsm-price').hidden = false;
          $('dsm-pay').textContent = 'Riattiva ora · ' + eur(cents) + ' / anno';
        }
        $('dsm-pay').focus();
        return;
      }
      if (d && d.ok && d.active) { b.textContent = 'Il menu è già attivo: ricarico…'; setTimeout(function () { location.reload(); }, 1500); return; }
      err((d && d.message) || 'Non è stato possibile continuare. Riprova.'); reset();
    }).catch(function () { err('Connessione non riuscita. Riprova.'); reset(); });
  });
})();
</script>
`;
  return h.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, nofollow">')
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${n} · Menu in pausa</title>`)
    .replace(/<link rel="canonical"[^>]*>\n?/, '')
    .replace(/<\/body>/i, () => `${overlay}</body>`);
}

// menu non ancora pubblicato: avviso nella lingua del menu / del cliente
const PREPARING = {
  it: 'Il menu digitale è in preparazione: sarà online a breve.',
  en: 'The digital menu is being prepared: it will be online soon.',
  es: 'El menú digital está en preparación: estará online muy pronto.',
  pt: 'O menu digital está a ser preparado: estará online em breve.',
  de: 'Die digitale Speisekarte wird gerade vorbereitet: Sie ist bald online.',
  fr: 'Le menu digital est en préparation : il sera bientôt en ligne.',
};

function simplePage(title, text, status, robots = 'noindex', lang = 'it') {
  return { status, html: `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${robots}">
<title>${esc(title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f1e7;color:#2b2420;
font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:24px;text-align:center}
main{max-width:440px}h1{font-size:1.5rem;margin:0 0 10px}p{margin:0;color:#6b5f57}</style></head>
<body><main><h1>${esc(title)}</h1><p>${text}</p></main></body></html>` };
}

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const slug = String(q.get('slug') || '').toLowerCase();
  const token = String(q.get('preview') || '');
  let out;
  try {
    if (token) {
      if (!/^[0-9a-f-]{36}$/i.test(token)) out = simplePage('Anteprima non trovata', 'Il link non è valido.', 404);
      else {
        const r = await rpc('menu_preview', { p_token: token });
        out = r.state === 'preview' ? { status: 200, html: render(r, { preview: true }) }
          : simplePage('Anteprima non disponibile', 'Questa anteprima non esiste più: probabilmente è già stata pubblicata o sostituita.', 404);
      }
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    } else if (!/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(slug)) {
      out = simplePage('Menu non trovato', 'Controlla l\'indirizzo o inquadra di nuovo il QR code.', 404);
    } else {
      const r = await rpc('menu_public', { p_slug: slug });
      if (r.state === 'moved') {
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        res.statusCode = 301;
        res.setHeader('Location', `/${r.slug}`);
        return res.end();
      }
      if (r.state === 'ok') out = { status: 200, html: render(r) };
      else if (r.state === 'paused') out = { status: 200, html: pausedPage(r) };
      else if (r.state === 'empty') {
        const lang = PREPARING[r.lang] ? r.lang : 'it';
        out = simplePage(`${r.name}`, PREPARING[lang], 200, 'noindex', lang);
      }
      else out = simplePage('Menu non trovato', 'Controlla l\'indirizzo o inquadra di nuovo il QR code.', 404);
      // in cache 60 s: una modifica pubblicata è online entro circa un minuto
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    }
  } catch (err) {
    console.error(err);
    out = simplePage('Menu momentaneamente non raggiungibile', 'Riprova tra qualche istante.', 503);
    res.setHeader('Cache-Control', 'no-store');
  }
  res.statusCode = out.status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(out.html);
}
