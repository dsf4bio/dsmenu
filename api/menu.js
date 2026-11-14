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
const SITE = 'https://www.dsmenu.it';
const THEMES = new Set(Array.from({ length: 21 }, (_, i) => `mdc-${String(i + 1).padStart(3, '0')}`));
// temi preparati con tools/prepara_temi.py: dati e intestazione tramite segnaposto
const PLACEHOLDER_THEMES = new Set(['mdc-005', 'mdc-006', 'mdc-007', 'mdc-008', 'mdc-009', 'mdc-010',
  'mdc-011', 'mdc-012', 'mdc-013', 'mdc-014', 'mdc-015',
  'mdc-016', 'mdc-017', 'mdc-018', 'mdc-019', 'mdc-020', 'mdc-021']);
// temi animati con i piatti illustrati di assets/piatti.js (Aura, Il Focolare, Vesuvio,
// La Piadaia, Zucchero Velo, The Copper Fox): stessi dati, disegno scelto dal nome del piatto
const ILLUSTRATED_THEMES = new Set(['mdc-016', 'mdc-017', 'mdc-018', 'mdc-019', 'mdc-020', 'mdc-021']);
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
  ? `<span class="dsm-logo" style="display:inline-block;box-sizing:border-box;width:${size};height:${size};aspect-ratio:1;padding:3px;border-radius:50%;background:${STORY_RING};flex:0 0 auto;vertical-align:middle"><img src="${esc(u)}" alt="Logo" decoding="async" style="display:block;box-sizing:border-box;width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #fff;background:#fff"></span>`
  : '');
const MONO_LOGO = '100%';
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
  const info = r.info || {};
  const n = esc(r.name);
  if (name === 'mdc-002') {
    return `<header class="top">
  ${info.kicker ? `<span class="badge">${esc(info.kicker)}</span>` : ''}
  <h1>${n}</h1>
  ${info.tagline ? `<p>${esc(info.tagline)}</p>` : ''}
  <span class="pizza" aria-hidden="true">🍕</span>
</header>`;
  }
  if (name === 'mdc-003') {
    return `<header class="top">
  <div>
    <h1>${n}</h1>
    ${info.tagline ? `<p>${esc(info.tagline)}</p>` : ''}
  </div>
  <div class="blob" aria-hidden="true">${logoImg(info.logo, MONO_LOGO) || esc(info.monogram || '🥕')}</div>
</header>`;
  }
  if (name === 'mdc-004') {
    const w = String(r.name || '').trim().split(/\s+/);
    const h1 = w.length > 1 ? `${esc(w.slice(0, -1).join(' '))}<br><span>${esc(w[w.length - 1])}</span>` : n;
    const stamp = String(info.kicker || '').split('·').map((x) => esc(x.trim())).filter(Boolean).join('<br>');
    const addr = [info.address, info.hours].filter(Boolean).map(esc).join(' · ');
    return `<header class="top">
  <div class="brand">
    <h1>${h1}</h1>
    ${stamp ? `<div class="stamp mono" aria-hidden="true">${stamp}</div>` : ''}
  </div>
  ${addr ? `<p class="addr">${addr}</p>` : ''}
</header>`;
  }
  const mono = logoImg(info.logo, MONO_LOGO) || esc(info.monogram || String(r.name || '?').trim().charAt(0).toUpperCase());
  return `<header class="hero">
  <div class="mono" aria-hidden="true">${mono}</div>
  ${info.kicker ? `<p class="kick">${esc(info.kicker)}</p>` : ''}
  <h1>${n}</h1>
  ${info.tagline ? `<p>${esc(info.tagline)}</p>` : ''}
  <div class="orn" aria-hidden="true">✦</div>
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

// dicitura sugli allergeni: sempre in fondo a ogni menu, con qualsiasi modello
const ALLERGEN_NOTICE = '<p class="fallergeni" role="note" style="max-width:600px;margin:16px auto 0;padding-top:12px;'
  + 'border-top:1px solid currentColor;border-top-color:rgba(127,127,127,.35);font-size:.78rem;line-height:1.5;opacity:.88">'
  + '<b>⚠️ Allergeni</b> (Reg. UE 1169/2011): gli allergeni sono indicati per ogni piatto. '
  + 'Se hai allergie o intolleranze alimentari chiedi sempre al personale prima di ordinare: '
  + 'i piatti possono contenere tracce di altri allergeni per contaminazione durante la preparazione.</p>';

function footer(r) {
  const i = r.info || {};
  const line = [i.address, i.phone ? `Tel. ${i.phone}` : '', i.hours].filter(Boolean).map(esc).join(' · ');
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
    i.phone && `<a href="tel:${esc(digits(i.phone))}">📞 Chiama</a>`,
    mapsUrl && `<a ${fLink(mapsUrl)}>📍 Dove siamo</a>`,
    i.reviews && `<a ${fLink(i.reviews)}>⭐ Lascia una recensione</a>`,
    i.website && `<a ${fLink(i.website)}>🌐 Sito web</a>`,
  ].filter(Boolean).join('');
  // la firma "Menu digitale by DS Service" è sempre l'ultima riga in basso
  return `<footer>
  ${i.logo && photoOk(i.logo) ? `<div style="margin:0 auto 12px">${logoImg(i.logo, '92px')}</div>` : ''}
  <strong>${esc(r.name)}</strong>
  ${line ? `<div class="finfo">${line}</div>` : ''}
  ${soc ? `<div class="soc">${soc}</div>` : ''}${links ? `<nav class="flinks" aria-label="Contatti">${links}</nav>` : ''}
  ${ALLERGEN_NOTICE}
  <small class="fby" style="display:block;margin-top:14px;opacity:.75">Menu digitale by <a href="https://dsfabio.com/?utm_source=dsmenu&amp;utm_medium=menu&amp;utm_campaign=${encodeURIComponent(r.slug || '')}" target="_blank" rel="noopener">DS Service</a> · <a href="https://dsfabio.com/?utm_source=dsmenu&amp;utm_medium=menu&amp;utm_campaign=${encodeURIComponent(r.slug || '')}" target="_blank" rel="noopener">Lo vuoi per il tuo locale?</a></small>
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
    case 'mdc-009': {
      // "Nel bicchiere ora": solo dalle sezioni di drink (cocktail, vini, bevande…)
      const drinks = S.filter((s) => DRINK_SECTION.test(s.title)).flatMap((s) => s.items).slice(0, 6).map((it, i) => ({ n: it.n, d: it.dPlain, c: LIQ[i % LIQ.length] }));
      out.js = `var AL = ${AL_JS};\nvar TASTES = {};\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: s.title, items: s.items.map((it) => base(it, { e: it.e, g: [], z: 0 })) })))
        + v('DSM_DRINKS', drinks);
      out.vars.DRINK_N = drinks[0]?.n || '';
      out.vars.DRINK_D = drinks[0]?.d || '';
      out.css = '.tastes{display:none!important}';
      break;
    }
    case 'mdc-010':
      out.js = `var AL = ${AL_JS};\n`
        + v('MENU', S.map((s) => ({ id: s.id, t: `${s.emoji || '🍔'} ${s.title}`, s: s.sub, items: s.items.map((it) => {
          const b = it.top ? 'TOP' : it.hot ? 'HOT' : it.veg ? 'VEG' : it.isNew ? 'NEW' : it.LABEL;
          return base(it, { e: it.e, ...(b ? { b, bc: it.veg && !it.top && !it.hot ? 'veg' : '' } : {}) });
        }) })));
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
    TAGLINE: esc(info.tagline || ''),
    HOURS: esc(info.hours || ''),
    HERO_EMOJI: esc(firstEmoji || '🍽️'),
    MONO: logoImg(info.logo, MONO_LOGO) || esc(info.monogram || String(r.name || '?').trim().charAt(0).toUpperCase()),
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

// ---------- pagina del menu ----------
// Visite: ogni telefono conta una volta al giorno per menu (la pagina è in cache,
// quindi il conteggio parte dal telefono e non dal server). Niente dati personali.
function viewBeacon(slug) {
  return `<script>(function(){try{var k='dsm-v-'+${json(slug)}+'-'+new Date().toISOString().slice(0,10);if(localStorage.getItem(k))return;localStorage.setItem(k,'1')}catch(e){}
if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent||''))return;
setTimeout(function(){try{fetch(${json(SUPABASE_URL)}+'/rest/v1/rpc/menu_view_hit',{method:'POST',keepalive:true,headers:{apikey:${json(SUPABASE_KEY)},'Content-Type':'application/json'},body:JSON.stringify({p_slug:${json(slug)}})}).catch(function(){})}catch(e){}},1500)})();</script>\n`;
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
  const desc = [r.info?.tagline, `Il menu di ${r.name}${r.city ? ` a ${r.city}` : ''}: piatti, prezzi e allergeni sempre aggiornati.`]
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

function simplePage(title, text, status, robots = 'noindex') {
  return { status, html: `<!doctype html><html lang="it"><head><meta charset="utf-8">
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
      else if (r.state === 'empty') out = simplePage(`${r.name}`, 'Il menu digitale è in preparazione: sarà online a breve.', 200);
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
