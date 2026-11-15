// Copertina uguale in tutti i modelli: tondo del logo in alto al centro, nome, slogan.
// Tutto il resto dell'intestazione (categoria, etichette, disegni) resta nella pagina ma nascosto
// (.dsm-old), così gli script dei modelli continuano a trovare i loro elementi.
// Uso: node tools/copertina.mjs <cartella dsmenu> <cartella dsfabio>   (si può rilanciare: salta i file già fatti)
import fs from 'node:fs';
import path from 'node:path';

const [DSMENU, DSFABIO] = process.argv.slice(2);
// id dsmenu → pagina dimostrativa su dsfabio.com
const DEMO = { 'mdc-014': 'demo-fuoco-brace', 'mdc-015': 'demo-sakura-neon', 'mdc-016': 'mdc-014', 'mdc-017': 'mdc-015',
  'mdc-018': 'mdc-016', 'mdc-019': 'mdc-017', 'mdc-020': 'mdc-018', 'mdc-021': 'mdc-019' };
const CFG = {
  'mdc-001': { at: 'header.hero' }, 'mdc-002': { at: 'header.top' }, 'mdc-003': { at: 'header.top' }, 'mdc-004': { at: 'header.top' },
  'mdc-005': { at: 'header.top' }, 'mdc-006': { at: 'header.top' }, 'mdc-007': { at: 'header.top' }, 'mdc-008': { at: 'header.hero' },
  'mdc-009': { at: 'header.hero' }, 'mdc-010': { at: 'section.build', before: true, demoTag: 'Smash burger · patatine · shake' },
  'mdc-011': { at: 'header.hero' }, 'mdc-012': { at: 'header.hero' }, 'mdc-013': { at: 'header.hero' }, 'mdc-014': { at: 'header.hero' },
  'mdc-015': { at: 'header.top' }, 'mdc-016': { at: 'header.hero' }, 'mdc-017': { at: 'header.top', nm: 'div.plank' },
  'mdc-018': { at: 'header.hero' }, 'mdc-019': { at: 'header.hero' }, 'mdc-020': { at: 'header.hero' },
  'mdc-021': { at: 'header.wall', nm: 'div.neon', demoTag: 'Pub · craft beer · kitchen' },
};
export const HD_CSS = '<style id="dsm-hd-css">'
  + '.dsm-hdr{min-height:0!important;height:auto!important;padding:0!important;display:block!important;max-width:none!important;'
  + 'width:auto!important;margin-left:0!important;margin-right:0!important;text-align:center!important;grid-template-columns:none!important}'
  + '.dsm-old{display:none!important}'
  + '.dsm-hd{position:relative;max-width:760px;margin:0 auto;padding:30px 20px 38px;text-align:center}'
  + '.dsm-hd-logo{display:block;width:84px;height:84px;margin:0 auto 16px;line-height:0}'
  + '.dsm-hd-logo>.dsm-logo{width:100%!important;height:100%!important}'
  + '.dsm-hd h1{margin-left:auto!important;margin-right:auto!important;margin-top:0!important;text-align:center!important}'
  + '.dsm-hd>p{margin:12px auto 0!important;max-width:520px;text-align:center!important;padding:0!important}'
  + '.dsm-hd small{display:none!important}'
  + '.dsm-cov .dsm-hd{padding-bottom:96px}'
  + '@media (max-width:600px){.dsm-hd{padding:26px 18px 32px}.dsm-hd-logo{width:76px;height:76px}.dsm-cov .dsm-hd{padding-bottom:84px}}'
  + '</style>';
// tondo con l'iniziale (finché il logo non c'è): stesso anello colorato del logo
export const monoRing = (ch) => `<span class="dsm-logo dsm-mono" aria-hidden="true" style="display:inline-block;box-sizing:border-box;width:100%;height:100%;padding:3px;border-radius:50%;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);vertical-align:middle"><span style="display:grid;place-items:center;width:100%;height:100%;box-sizing:border-box;border-radius:50%;border:3px solid #fff;background:#fffbf2;color:#2a1b14;font:700 2.1rem/1 Georgia,'Times New Roman',serif">${ch}</span></span>`;

function openTag(h, sel, from = 0) {
  const [tag, cls] = sel.split('.');
  const re = new RegExp(cls ? `<${tag}\\b[^>]*\\bclass="[^"]*\\b${cls}\\b[^"]*"[^>]*>` : `<${tag}\\b[^>]*>`, 'g');
  re.lastIndex = from;
  const m = re.exec(h);
  return m ? { i: m.index, tag, open: m[0] } : null;
}
function elementEnd(h, i, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(h))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  throw new Error('elemento non chiuso: ' + tag);
}
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function transform(h, id, demo) {
  if (h.includes('class="dsm-hd"')) return null;
  const cfg = CFG[id];
  const hd = openTag(h, cfg.at);
  if (!hd) throw new Error(id + ': intestazione non trovata');
  const hEnd = elementEnd(h, hd.i, hd.tag);
  let inner = h.slice(hd.i + hd.open.length, hEnd - `</${hd.tag}>`.length);
  // nome
  const nm = openTag(inner, cfg.nm || 'h1');
  if (!nm) throw new Error(id + ': nome non trovato');
  const nmEnd = elementEnd(inner, nm.i, nm.tag);
  const name = inner.slice(nm.i, nmEnd);
  inner = inner.slice(0, nm.i) + inner.slice(nmEnd);
  // slogan: il primo <p> dopo il nome
  let tag = '';
  const p = cfg.before ? null : openTag(inner, 'p', nm.i);
  if (p) { const pe = elementEnd(inner, p.i, 'p'); tag = inner.slice(p.i, pe); inner = inner.slice(0, p.i) + inner.slice(pe); }
  else if (!demo) tag = '<p data-dsm-opt="TAGLINE">__DSM_TAGLINE__</p>';
  else if (cfg.demoTag) tag = `<p>${cfg.demoTag}</p>`;
  const letter = demo ? (text(name).replace(/^the\s+/i, '').charAt(0).toUpperCase() || '?') : null;
  const block = `\n<div class="dsm-hd"><span class="dsm-hd-logo">${demo ? monoRing(letter) : '__DSM_HDLOGO__'}</span>${name}${tag}</div>\n`;
  let out;
  if (cfg.before) {
    // Smash Lab: la copertina diventa una testata a sé sopra al burger da costruire
    const sec = hd.open + inner + `</${hd.tag}>`;
    out = h.slice(0, hd.i) + `<header class="dsm-hdr dsm-hdr10">${block}</header>\n` + sec + h.slice(hEnd);
  } else {
    const open = hd.open.replace(/class="([^"]*)"/, 'class="$1 dsm-hdr"');
    out = h.slice(0, hd.i) + open + block + `<div class="dsm-old" hidden>${inner}</div>\n</${hd.tag}>` + h.slice(hEnd);
  }
  let css = HD_CSS;
  if (id === 'mdc-010') css = css.replace('</style>', '.dsm-hdr10{background:var(--yel);background-image:radial-gradient(rgba(0,0,0,.09) 2px,transparent 2.5px);background-size:22px 22px}.build .done{display:none!important}.build .stick{grid-template-rows:1fr auto auto!important}</style>');
  return out.replace('</head>', () => `${css}\n</head>`);
}

for (const id of Object.keys(CFG)) {
  const files = [[path.join(DSFABIO, (DEMO[id] || id) + '.html'), true]];
  // mdc-001…004 su dsmenu: l'intestazione la scrive api/menu.js, qui serve solo lo stile
  files.push([path.join(DSMENU, 'themes', id + '.html'), false]);
  for (const [f, demo] of files) {
    let h = fs.readFileSync(f, 'utf8');
    if (!demo && ['mdc-001', 'mdc-002', 'mdc-003', 'mdc-004'].includes(id)) {
      if (h.includes('id="dsm-hd-css"')) continue;
      fs.writeFileSync(f, h.replace('</head>', () => `${HD_CSS}\n</head>`)); console.log('stile', f); continue;
    }
    const out = transform(h, id, demo);
    if (out == null) { console.log('già fatto', f); continue; }
    fs.writeFileSync(f, out); console.log('ok', f);
  }
}
