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
const THEMES = new Set(['mdc-001', 'mdc-002', 'mdc-003', 'mdc-004']);
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
function toTheme(name, data) {
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const DIET = { veg: 'Vegetariano', vegan: 'Vegano' };
  const MENU = sections.map((s) => {
    const sec = { id: esc(s.id), t: esc(s.title), s: esc(s.subtitle || ''), e: esc(s.emoji || ''),
                  da: num(s.from, 0), a: num(s.to, 24), items: [] };
    sec.items = (Array.isArray(s.items) ? s.items : []).map((it) => {
      const labels = (Array.isArray(it.labels) ? it.labels : []).map(esc);
      const o = { n: esc(it.name), d: esc(it.description || ''), p: num(it.price, 0),
                  a: (Array.isArray(it.allergens) ? it.allergens : []).filter((x) => ALLERGENS.has(x)),
                  e: esc(it.emoji || '') };
      if (name === 'mdc-001') o.t = [...(DIET[it.diet] ? [DIET[it.diet]] : []), ...labels];
      if (name === 'mdc-002') o.t = [...(it.diet ? ['veg'] : []), ...(it.spicy ? ['hot'] : []), ...(it.new ? ['new'] : [])];
      if (name === 'mdc-003') { if (it.diet === 'vegan') o.vg = 1; else if (it.diet === 'veg') o.v = 1; }
      if (name === 'mdc-004') o.t = labels[0] || '';
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
  <div class="blob" aria-hidden="true">${esc(info.monogram || '🥕')}</div>
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
  const mono = esc(info.monogram || String(r.name || '?').trim().charAt(0).toUpperCase());
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
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.8 4.9-1.3A9.9 9.9 0 1 0 12.04 2zm5.8 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a17 17 0 0 1-1.7-.6 13.4 13.4 0 0 1-5.1-4.5c-.4-.5-1.3-1.7-1.3-3.3s.8-2.3 1.1-2.6c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2.1 1.3 2.4 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.4z"/></svg>',
};

function footer(r) {
  const i = r.info || {};
  const line = [i.address, i.phone ? `Tel. ${i.phone}` : ''].filter(Boolean).map(esc).join(' · ');
  const soc = [
    i.facebook && `<a class="fb" href="${esc(i.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>`,
    i.instagram && `<a class="ig" href="${esc(i.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>`,
    i.whatsapp && `<a class="wa" href="https://wa.me/${esc(digits(i.whatsapp).replace('+', ''))}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>`,
  ].filter(Boolean).join('');
  const links = [
    i.phone && `<a href="tel:${esc(digits(i.phone))}">📞 Chiama</a>`,
    (i.maps || i.address) && `<a href="${esc(i.maps || `https://maps.google.com/?q=${encodeURIComponent([i.address, r.city].filter(Boolean).join(', '))}`)}" target="_blank" rel="noopener">📍 Dove siamo</a>`,
    i.reviews && `<a href="${esc(i.reviews)}" target="_blank" rel="noopener">⭐ Lascia una recensione</a>`,
    i.website && `<a href="${esc(i.website)}" target="_blank" rel="noopener">🌐 Sito web</a>`,
  ].filter(Boolean).join('');
  return `<footer>
  <strong>${esc(r.name)}</strong>
  ${line}${line ? '<br>' : ''}<small>Menu digitale by <a href="https://dsfabio.com" target="_blank" rel="noopener">DS Service</a></small>
  ${soc ? `<div class="soc">${soc}</div>` : ''}${links ? `<nav class="flinks" aria-label="Contatti">${links}</nav>` : ''}
</footer>`;
}

// ---------- pagina del menu ----------
function render(r, { preview = false } = {}) {
  const name = THEMES.has(r.theme) ? r.theme : DEFAULT_THEME;
  let h = theme(name);
  const { MENU, TASTING, NOTE } = toTheme(name, r.data);
  const url = `${SITE}/${r.slug}`;
  const title = `${r.name} · Menu${r.city ? ` · ${r.city}` : ''}`;
  const desc = [r.info?.tagline, `Il menu di ${r.name}${r.city ? ` a ${r.city}` : ''}: piatti, prezzi e allergeni sempre aggiornati.`]
    .filter(Boolean).join(' · ');

  // dati: sostituisce solo i piatti, tiene legenda allergeni e filtri del tema
  h = h.replace(/var MENU = \[[\s\S]*?\n\];/, () => `var MENU = ${json(MENU)};`)
       .replace(/var TASTING = \{.*\};/, () => `var TASTING = ${json(TASTING)};`)
       .replace(/var NOTE = '.*';/, () => `var NOTE = ${json(NOTE)};`);

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
  h = h.replace(/<div class="demo">[\s\S]*?<\/div>/, preview
    ? `<div class="demo">ANTEPRIMA · versione ${esc(r.version)} non ancora pubblicata</div>` : '');

  h = h.replace(/<header[\s\S]*?<\/header>/, () => header(name, r));
  h = h.replace(/<footer>[\s\S]*?<\/footer>/, () => footer(r));
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
  const overlay = `
<style>
html,body{overflow:hidden!important;height:100%!important}
body>*:not(#dsm-pause){filter:blur(7px) saturate(.8);pointer-events:none!important;user-select:none!important}
#dsm-pause{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;
  background:rgba(250,246,238,.55);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#2b2420;
  -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);overflow:auto}
#dsm-pause *{box-sizing:border-box;text-shadow:none;font-family:inherit;text-transform:none;letter-spacing:normal;-webkit-text-stroke:0;filter:none}
#dsm-pause *::before,#dsm-pause *::after{content:none!important}
#dsm-pause .card{width:100%;max-width:400px;background:#fffdf9;border-radius:22px;padding:28px 24px 22px;text-align:center;
  box-shadow:0 18px 50px rgba(43,36,32,.22),0 2px 6px rgba(43,36,32,.08)}
#dsm-pause .ico{width:56px;height:56px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;background:#f3ebdd;font-size:26px}
#dsm-pause h1{font-size:1.35rem;line-height:1.25;margin:0 0 8px;font-weight:700;letter-spacing:-.01em;color:#2b2420;background:none;padding:0}
#dsm-pause p{margin:0;color:#6b5f57}
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
#dsm-pause .err{color:#b42318;font-size:.88rem;margin-top:8px}
#dsm-pause .ok{color:#1f7a3a;font-size:.88rem;margin-top:8px}
#dsm-pause .by{margin-top:18px;font-size:.75rem;color:#a0948a}
#dsm-pause .by a{color:inherit}
</style>
<div id="dsm-pause" role="dialog" aria-modal="true" aria-labelledby="dsm-pause-t">
  <div class="card">
    <div class="ico" aria-hidden="true">🍽️</div>
    <h1 id="dsm-pause-t">Il menu digitale è in pausa</h1>
    <p>Il menu di <strong>${n}</strong> al momento non è disponibile online. Chiedi pure al personale: sarà felice di aiutarti!</p>
    <div class="sep"></div>
    <div class="own">
      <div id="dsm-own-q"><p>Sei il titolare?</p>
        <button type="button" class="btn" id="dsm-open">Riattiva il menu in un minuto</button></div>
      <form id="dsm-form" hidden novalidate>
        <label for="dsm-code">Il tuo codice cliente</label>
        <input id="dsm-code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="Es. ABC12345" required>
        <div class="hint">Lo trovi sulla scheda che ti abbiamo consegnato.</div>
        <div class="err" id="dsm-err" role="alert" hidden></div>
        <button type="submit" class="btn" id="dsm-go">Vai al pagamento</button>
        <div class="hint" style="text-align:center;margin-top:10px">Pagamento sicuro con Stripe · il menu torna online appena il pagamento è confermato</div>
      </form>
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
  $('dsm-open').addEventListener('click', function () {
    $('dsm-own-q').hidden = true; $('dsm-form').hidden = false; $('dsm-code').focus();
  });
  function err(t) { var e = $('dsm-err'); e.textContent = t || ''; e.hidden = !t; }
  $('dsm-form').addEventListener('submit', function (ev) {
    ev.preventDefault(); err('');
    var code = $('dsm-code').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!/^[A-Z]{3}[0-9OIL]{5}$/.test(code)) return err('Il codice cliente è formato da 3 lettere e 5 numeri (es. ABC12345).');
    var b = $('dsm-go'); b.disabled = true; b.textContent = 'Un attimo…';
    fetch(SB + '/rest/v1/rpc/menu_reactivate', {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: SLUG, p_code: code })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok && d.pay_url) { b.textContent = 'Apro il pagamento…'; location.href = d.pay_url; return; }
      if (d && d.ok && d.active) { err(''); $('dsm-err').hidden = true; b.textContent = 'Il menu è già attivo: ricarico…'; setTimeout(function () { location.reload(); }, 1500); return; }
      err((d && d.message) || 'Non è stato possibile continuare. Riprova.');
      b.disabled = false; b.textContent = 'Vai al pagamento';
    }).catch(function () {
      err('Connessione non riuscita. Riprova.'); b.disabled = false; b.textContent = 'Vai al pagamento';
    });
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
