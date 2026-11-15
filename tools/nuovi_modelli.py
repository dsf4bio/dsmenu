# -*- coding: utf-8 -*-
"""
Tre modelli rifatti da zero: Bella Napoli (mdc-002), Ice Lounge (mdc-009), Smash Lab (mdc-010).
Da un'unica sorgente escono:
  - dsmenu/themes/mdc-0xx.html  → il menu vero (segnaposto __DSM_…__ riempiti da api/menu.js, dati in /*DSM:DATA*/)
  - dsfabio/<pagina demo>.html  → la pagina dimostrativa con dati di esempio
Copertina uguale agli altri modelli (tondo del logo, nome, slogan), piatti disegnati da assets/piatti.js
(immagini 3D, oppure le foto del locale caricate dal gestionale), scheda piatto con allergeni.
Uso: python3 tools/nuovi_modelli.py <cartella dsmenu> <cartella dsfabio>
"""
import json, re, sys, pathlib

DSMENU, DSFABIO = map(pathlib.Path, sys.argv[1:3])
HD_CSS = re.search(r'<style id="dsm-hd-css">.*?</style>', (DSMENU / 'themes/mdc-005.html').read_text()).group(0)

def mono(ch):
    return ('<span class="dsm-logo dsm-mono" aria-hidden="true" style="display:inline-block;box-sizing:border-box;width:100%;height:100%;padding:3px;'
            'border-radius:50%;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);vertical-align:middle"><span style="display:grid;'
            'place-items:center;width:100%;height:100%;box-sizing:border-box;border-radius:50%;border:3px solid #fff;background:#fffbf2;color:#2a1b14;'
            "font:700 2.1rem/1 Georgia,'Times New Roman',serif\">" + ch + '</span></span>')

FOOT_CSS = """[hidden]{display:none!important}
footer{text-align:center;padding:34px 18px 38px;font-size:.9rem;line-height:1.5}
footer strong{display:block;font-size:1.45rem;line-height:1.15;margin-bottom:6px}
footer .finfo{opacity:.85}footer small{opacity:.7}
.soc{display:flex;justify-content:center;gap:12px;margin:18px 0 6px}
.soc a{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;color:#fff;text-decoration:none;transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
.soc a:hover{transform:translateY(-4px) scale(1.06)}
.soc a.fb{background:#1877F2}.soc a.wa{background:#25D366}.soc a.tt{background:#111}
.soc a.ig{background:radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)}
.soc svg{width:22px;height:22px}
.flinks{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;margin-top:10px;font-size:.85rem}
.flinks a,footer .fby a{color:inherit;text-decoration:underline;text-underline-offset:3px;opacity:.9}
"""

# ---------- script comune: categorie, sezioni, scheda piatto, scorrimento, comparsa animata ----------
COMMON_JS = r"""
var $ = function (s) { return document.querySelector(s); };
var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
var nav = $('#cats'), menu = $('#menu');
M.forEach(function (c, k) { c.k = k; (c.items || []).forEach(function (it) { it.cat = c.n; it.catObj = c; }); });
var plural = function (n) { return n + (n === 1 ? ' proposta' : ' proposte'); };
var tag = function (it) { return Piatti.label(it); };
nav.innerHTML = M.map(NAV).join('');
menu.innerHTML = M.map(function (c) {
  return '<section class="sec" id="c' + c.k + '" aria-labelledby="h' + c.k + '">' + HEAD(c)
    + '<div class="list">' + c.items.map(function (it, i) { return CARD(it, c, i); }).join('') + '</div></section>';
}).join('') + '<p class="empty" id="empty" hidden></p>';
/* scheda del piatto */
menu.addEventListener('click', function (e) {
  var b = e.target.closest('[data-i]'); if (!b) return;
  var c = M[+b.getAttribute('data-c')];
  Piatti.modal(c.items, +b.getAttribute('data-i'), b);
});
/* categorie: vai alla sezione, e la categoria attiva segue lo scorrimento */
var navBox = nav.closest('.navbar') || nav;
nav.addEventListener('click', function (e) {
  var b = e.target.closest('[data-k]'); if (!b) return;
  var s = document.getElementById('c' + b.getAttribute('data-k'));
  var y = s.getBoundingClientRect().top + scrollY - navBox.offsetHeight - 10;
  scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
});
var secs = [].slice.call(menu.querySelectorAll('.sec')), btns = [].slice.call(nav.querySelectorAll('[data-k]')), on = -1;
function spy() {
  var y = navBox.getBoundingClientRect().bottom + 24, cur = 0;
  secs.forEach(function (s, k) { if (!s.hidden && s.getBoundingClientRect().top <= y) cur = k; });
  if (cur === on) return; on = cur;
  btns.forEach(function (b, k) { b.classList.toggle('on', k === cur); b.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
  var b = btns[cur]; if (b && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: b.offsetLeft - nav.clientWidth / 2 + b.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
  if (typeof MOVED === 'function') MOVED(cur, b);
}
addEventListener('scroll', spy, { passive: true }); addEventListener('resize', spy); spy();
/* comparsa animata dei piatti quando entrano nello schermo */
if ('IntersectionObserver' in window && !reduced) {
  document.documentElement.classList.add('js-rv');
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px' });
  [].forEach.call(menu.querySelectorAll('.rv, .sec'), function (el) { io.observe(el); });
}
"""

SEARCH_JS = r"""
/* ricerca per nome o ingrediente */
var q = $('#q'), clr = $('#clr'), empty = $('#empty');
var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
function search() {
  var t = norm(q.value.trim()), any = 0;
  clr.hidden = !q.value;
  secs.forEach(function (s) {
    var n = 0;
    [].forEach.call(s.querySelectorAll('[data-i]'), function (b) { var ok = !t || norm(b.textContent).indexOf(t) > -1; b.hidden = !ok; if (ok) { n++; b.classList.add('in'); } });
    s.hidden = !n; any += n;
  });
  empty.hidden = !!any; if (!any) empty.textContent = 'Nessun piatto trovato per “' + q.value + '”';
  on = -1; spy();
}
q.addEventListener('input', search);
clr.addEventListener('click', function () { q.value = ''; search(); q.focus(); });
"""

def page(T, demo):
    """T = descrizione del modello; demo = True per la pagina dimostrativa"""
    if demo:
        logo, name, tagline = mono(T['letter']), T['demo_name'], f"<p>{T['demo_tagline']}</p>"
        data = 'var M = ' + json.dumps(T['demo_data'], ensure_ascii=False, indent=0).replace('\n', '') + ';'
        note = f'<div class="note">{T["demo_note"]}</div>' if T.get('demo_note') else ''
        footer = f'<footer>\n  <strong>{name}</strong>\n  <div class="finfo">{T["demo_addr"]}</div><small>Dati di esempio</small>\n</footer>'
        trial = f'<script src="assets/trial.js" data-model="{T["demo_name"]}" defer></script>\n'
    else:
        logo, name, tagline = '__DSM_HDLOGO__', '__DSM_NAME__', '<p data-dsm-opt="TAGLINE">__DSM_TAGLINE__</p>'
        data = '/*DSM:DATA*/'
        note = '<div class="note" data-dsm-opt="NOTE">__DSM_NOTE__</div>' if T.get('note') else ''
        footer = '<footer>\n  <strong>__DSM_NAME__</strong>\n</footer>'
        trial = ''
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, follow">
<meta name="theme-color" content="{T['theme_color']}">
<title>{T['demo_name']} · Modello di menu digitale (esempio) | DS Service</title>
<meta name="description" content="{T['desc']}">
<meta property="og:type" content="website">
<meta property="og:locale" content="it_IT">
<meta property="og:site_name" content="DS Service · Menu digitali">
<meta property="og:title" content="{T['demo_name']} · Modello di menu digitale (esempio) | DS Service">
<meta property="og:description" content="{T['desc']}">
<meta property="og:url" content="https://dsfabio.com/{T['demo_file']}">
<meta property="og:image" content="https://dsfabio.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/fonts/{T['fonts']}">
<style>
{T['css']}
{FOOT_CSS}{T['foot_css']}
/* dsmenu: riquadri con dati di esempio nascosti */
.dsm-fake{{display:none!important}}
@media (prefers-reduced-motion:reduce){{*,*::before,*::after{{animation:none!important;transition:none!important}}}}
</style>
{HD_CSS}
</head>
<body>
<div class="demo">MODELLO DIMOSTRATIVO · piatti, prezzi e dati sono di fantasia</div>
<header class="hero dsm-hdr">
<div class="dsm-hd"><span class="dsm-hd-logo">{logo}</span><h1>{name}</h1>{tagline}</div>
</header>
{T['body']}
<main class="wrap" id="menu" aria-live="polite"></main>
{note}
{footer}

<script src="assets/piatti.js"></script>
<script>
(function () {{
'use strict';
{data}
Piatti.style3d = true; // immagini 3D del prodotto (o le foto del locale, se caricate)
{T['js']}
{COMMON_JS}{SEARCH_JS if T.get('search') else ''}}})();
</script>
{trial}</body>
</html>
"""

# =====================================================================
# Bella Napoli – maioliche blu e gialle, limoni, piatti che si girano
# =====================================================================
NAPOLI = dict(
    id='mdc-002', demo_file='mdc-002', demo_name='Bella Napoli', letter='B', theme_color='#1d4e9e',
    demo_tagline='Pizza napoletana · impasto a 48 ore', demo_addr='Piazza Dante 3, Napoli · Tel. 081 123456',
    demo_note='<b>Impasto senza glutine?</b> Disponibile su richiesta (+2 €). Chiedi al personale.',
    desc='Pizzeria napoletana con le maioliche: categorie a piastrelle, piatti 3D e scheda con allergeni. Modello di menu digitale con QR code.',
    fonts='fredoka-nunito.css', note=True, search=True,
    css=r""":root{--blu:#1d4e9e;--blu2:#143a7a;--sky:#e8f0fb;--gial:#f6c343;--lim:#ffe27a;--verde:#3f8f4a;--rosso:#d8432f;--crema:#fffaf0;--ink:#1b2a4a;--sub:#5b6b8c;--line:#d9e3f3;
--pm-bg:#fffaf0;--pm-ink:#1b2a4a;--pm-sub:#5b6b8c;--pm-accent:#1d4e9e;--pm-accent-ink:#fff;--pm-head:Fredoka,sans-serif;--pm-line:#d9e3f3;--pm-art:radial-gradient(70% 70% at 50% 45%,#fff,#e8f0fb)}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;overflow-x:clip}
body{font-family:Nunito,system-ui,sans-serif;color:var(--ink);background:var(--crema);line-height:1.5;overflow-x:clip}
button,input{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--gial);outline-offset:3px;border-radius:10px}
.demo{background:var(--blu2);color:var(--lim);text-align:center;font-size:.74rem;font-weight:800;padding:7px 12px}
.wrap{max-width:860px;margin:0 auto;padding:0 16px}
/* copertina: piastrelle di maiolica blu e gialle */
.hero{position:relative;color:#fff;overflow:hidden}
.hero:not(.dsm-cov){background-color:var(--blu);background-image:linear-gradient(rgba(20,58,122,.80),rgba(29,78,158,.90)),
 radial-gradient(circle at 50% 50%,var(--gial) 0 7px,transparent 8px),
 radial-gradient(circle at 0 0,transparent 0 17px,rgba(255,255,255,.9) 18px 20px,transparent 21px),
 radial-gradient(circle at 100% 0,transparent 0 17px,rgba(255,255,255,.9) 18px 20px,transparent 21px),
 radial-gradient(circle at 0 100%,transparent 0 17px,rgba(255,255,255,.9) 18px 20px,transparent 21px),
 radial-gradient(circle at 100% 100%,transparent 0 17px,rgba(255,255,255,.9) 18px 20px,transparent 21px),
 linear-gradient(45deg,transparent 46%,rgba(246,195,67,.6) 47% 53%,transparent 54%),
 linear-gradient(-45deg,transparent 46%,rgba(246,195,67,.6) 47% 53%,transparent 54%);
 background-size:100% 100%,56px 56px,56px 56px,56px 56px,56px 56px,56px 56px,56px 56px,56px 56px;animation:tiles 40s linear infinite}
@keyframes tiles{to{background-position:0 0,56px 56px,56px 56px,56px 56px,56px 56px,56px 56px,56px 56px,56px 56px}}
.hero h1{font-family:Fredoka,sans-serif;font-weight:700;font-size:clamp(2.5rem,11vw,4.4rem);line-height:.95;letter-spacing:-.01em;text-shadow:0 3px 0 rgba(0,0,0,.18)}
.hero p{color:var(--lim);font-weight:800;font-size:1.02rem}
.hero:not(.dsm-cov) .dsm-hd{padding-bottom:58px}
.scallop{height:22px;margin-top:-22px;position:relative;z-index:2;background:radial-gradient(circle at 50% 0,transparent 0 13px,var(--crema) 14px) 0 0/28px 22px repeat-x}
.hero.dsm-cov+.scallop{display:none}
/* ricerca + piastrelle delle categorie */
.navbar{position:sticky;top:0;z-index:20;background:rgba(255,250,240,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.cat .t{width:56px!important;height:56px!important}.cat .t .pa{width:40px!important;height:40px!important}.cats{padding:8px 16px!important}
.search{display:flex;align-items:center;gap:10px;margin:14px auto 4px;max-width:860px;padding:0 16px}
.search label{flex:1;display:flex;align-items:center;gap:10px;background:#fff;border:2px solid var(--line);border-radius:16px;padding:0 14px;transition:border-color .2s}
.search label:focus-within{border-color:var(--blu)}
.search input{flex:1;min-width:0;border:0;background:none;padding:12px 0;font-size:1rem;outline:none}
.search button{border:0;background:none;font-size:1.1rem;color:var(--sub);cursor:pointer;padding:4px}
.cats{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:12px 16px 12px;max-width:860px;margin:0 auto}
.cats::-webkit-scrollbar{display:none}
.cat{flex:none;display:flex;flex-direction:column;align-items:center;gap:5px;width:78px;border:0;background:none;cursor:pointer;perspective:400px}
.cat .t{width:62px;height:62px;border-radius:16px;display:grid;place-items:center;background:#fff;border:3px solid var(--blu);box-shadow:inset 0 0 0 3px #fff,inset 0 0 0 5px var(--gial),0 6px 14px -8px rgba(20,58,122,.6);transition:transform .6s cubic-bezier(.3,1.4,.5,1),background .3s}
.cat .t .pa{width:44px;height:44px}
.cat b{font-size:.74rem;font-weight:800;line-height:1.15;color:var(--sub);text-align:center}
.cat.on .t{transform:rotateY(360deg) translateY(-3px);background:var(--lim)}
.cat.on b{color:var(--blu)}
/* sezioni */
main{padding-top:10px;padding-bottom:30px}
.sec{padding-top:18px}
.sec-h{display:flex;align-items:center;gap:12px;margin:8px 0 14px}
.sec-h .ill{flex:none;width:58px;height:58px;border-radius:50%;background:var(--sky);display:grid;place-items:center;border:3px dashed var(--blu)}
.sec-h .ill .pa{width:42px;height:42px}
.sec-h h2{font-family:Fredoka,sans-serif;font-weight:700;font-size:1.6rem;color:var(--blu);line-height:1.1}
.sec-h small{display:block;color:var(--sub);font-weight:700;font-size:.85rem}
.list{display:grid;gap:12px}
@media (min-width:700px){.list{grid-template-columns:1fr 1fr}}
.dish{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:#fff;border:2px solid var(--line);border-radius:20px;padding:12px;cursor:pointer;position:relative;transition:border-color .2s,transform .2s,box-shadow .2s}
.dish:hover{border-color:var(--blu);transform:translateY(-2px);box-shadow:0 12px 24px -16px rgba(20,58,122,.5)}
.plate{flex:none;width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#fff 0 56%,var(--sky) 57% 64%,#fff 65% 70%,var(--blu) 71% 75%,#fff 76%);box-shadow:0 6px 12px -8px rgba(20,58,122,.6)}
.plate .pa{width:54px;height:54px}
.plate img.pa-photo{width:66px;height:66px;border-radius:50%}
.dish .tx{flex:1;min-width:0}
.dish h3{font-family:Fredoka,sans-serif;font-weight:600;font-size:1.12rem;line-height:1.2}
.dish p{color:var(--sub);font-size:.88rem;line-height:1.35;margin-top:2px}
.dish .meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:.85rem}
.chip{font-size:.72rem;font-weight:800;padding:3px 9px;border-radius:999px;background:var(--sky);color:var(--blu)}
.chip.hot{background:#fde3df;color:var(--rosso)}.chip.veg{background:#e3f3e5;color:var(--verde)}
.price{flex:none;align-self:flex-start;font-family:Fredoka,sans-serif;font-weight:700;font-size:1.02rem;color:var(--ink);background:var(--lim);border-radius:999px;padding:4px 11px;box-shadow:0 3px 0 var(--gial)}
/* piatti che si girano come piastrelle */
.js-rv .rv{opacity:0;transform:perspective(700px) rotateX(-70deg);transform-origin:50% 0;transition:opacity .5s ease,transform .7s cubic-bezier(.2,1.3,.4,1)}
.js-rv .rv.in{opacity:1;transform:none}
.empty{text-align:center;color:var(--sub);font-weight:700;padding:30px 0}
.note{max-width:828px;margin:0 auto 26px;width:calc(100% - 32px);background:var(--lim);border-radius:18px;padding:14px 16px;font-size:.92rem;box-shadow:0 4px 0 var(--gial)}
""",
    foot_css="footer{color:#fff}footer strong{font-family:Fredoka,sans-serif;font-weight:700}\nfooter{background:var(--blu)}footer .fallergeni{border-top-color:rgba(255,255,255,.3)!important}\n",
    body="""<div class="scallop" aria-hidden="true"></div>
<div class="search"><label><span aria-hidden="true">🔎</span><input id="q" type="search" placeholder="Cerca una pizza o un ingrediente…" aria-label="Cerca nel menu" autocomplete="off"><button type="button" id="clr" aria-label="Cancella la ricerca" hidden>✕</button></label></div>
<div class="navbar"><nav class="cats" id="cats" aria-label="Categorie"></nav></div>""",
    js=r"""
var NAV = function (c) { return '<button class="cat" type="button" data-k="' + c.k + '"><span class="t">' + Piatti.catArt(c) + '</span><b>' + c.n + '</b></button>'; };
var HEAD = function (c) { return '<div class="sec-h"><span class="ill" aria-hidden="true">' + Piatti.catArt(c) + '</span><div><h2 id="h' + c.k + '">' + c.n + '</h2><small>' + (c.s ? c.s + ' · ' : '') + plural(c.items.length) + '</small></div></div>'; };
var CARD = function (it, c, i) {
  var lb = tag(it), cl = it.hot ? 'hot' : it.veg ? 'veg' : '';
  return '<button class="dish rv" type="button" data-c="' + c.k + '" data-i="' + i + '" style="transition-delay:' + (i % 4) * 70 + 'ms">'
    + '<span class="plate">' + Piatti.art(it, c) + '</span><span class="tx"><h3>' + it.n + '</h3>' + (it.d ? '<p>' + it.d + '</p>' : '')
    + '<span class="meta">' + (lb ? '<span class="chip ' + cl + '">' + lb + '</span>' : '') + '<span aria-label="Allergeni">' + Piatti.alIcons(it.al) + '</span></span></span>'
    + '<span class="price">' + Piatti.price(it.p) + '</span></button>';
};
""",
    demo_data=[
        {'n': 'Le classiche', 's': 'Le pizze di sempre', 'e': '🍕', 'items': [
            {'n': 'Margherita', 'd': 'Pomodoro San Marzano, fiordilatte, basilico, olio EVO', 'p': 6.5, 'al': ['glutine', 'latte'], 'e': '🍕', 'veg': 1, 'top': 1},
            {'n': 'Marinara', 'd': 'Pomodoro, aglio, origano, olio EVO', 'p': 5.5, 'al': ['glutine'], 'e': '🍅', 'veg': 1},
            {'n': 'Diavola', 'd': 'Pomodoro, fiordilatte, salame piccante', 'p': 8, 'al': ['glutine', 'latte'], 'e': '🌶️', 'hot': 1},
            {'n': 'Capricciosa', 'd': 'Pomodoro, fiordilatte, cotto, funghi, carciofi, olive', 'p': 9, 'al': ['glutine', 'latte'], 'e': '🍄'},
            {'n': 'Quattro formaggi', 'd': 'Fiordilatte, gorgonzola, provola, parmigiano', 'p': 9, 'al': ['glutine', 'latte'], 'e': '🧀', 'veg': 1}]},
        {'n': 'Le speciali', 's': 'Le nostre firme', 'e': '⭐', 'items': [
            {'n': 'Bella Napoli', 'd': 'Bufala DOP, pomodorini del piennolo, basilico, scaglie di parmigiano', 'p': 11, 'al': ['glutine', 'latte'], 'e': '🍕', 'isNew': 1},
            {'n': 'Salsiccia e friarielli', 'd': 'Fiordilatte affumicato, salsiccia, friarielli', 'p': 10, 'al': ['glutine', 'latte'], 'e': '🥬'},
            {'n': 'Mortadella e pistacchio', 'd': 'Fiordilatte, mortadella, granella e crema di pistacchio', 'p': 11, 'al': ['glutine', 'latte', 'frutta'], 'e': '🥜'},
            {'n': 'Nduja e burrata', 'd': 'Pomodoro, nduja calabrese, burrata a crudo', 'p': 12, 'al': ['glutine', 'latte'], 'e': '🔥', 'hot': 1}]},
        {'n': 'Fritti', 's': 'Prima della pizza', 'e': '🍟', 'items': [
            {'n': 'Montanara', 'd': 'Pizza fritta con pomodoro e parmigiano', 'p': 5, 'al': ['glutine', 'latte'], 'e': '🫓', 'veg': 1},
            {'n': 'Frittatina di pasta', 'd': 'Bucatini, besciamella, piselli, prosciutto', 'p': 3.5, 'al': ['glutine', 'latte', 'uova'], 'e': '🍝'},
            {'n': 'Arancino al ragù', 'd': 'Riso, ragù di carne, piselli, mozzarella', 'p': 4, 'al': ['glutine', 'latte', 'uova', 'sedano'], 'e': '🍙'},
            {'n': 'Patatine fritte', 'd': 'Porzione abbondante', 'p': 4, 'al': [], 'e': '🍟', 'veg': 1}]},
        {'n': 'Dolci', 's': 'Fatti in casa', 'e': '🍰', 'items': [
            {'n': 'Babà al rum', 'd': 'Con crema pasticcera e amarene', 'p': 5, 'al': ['glutine', 'uova', 'latte'], 'e': '🧁'},
            {'n': 'Sfogliatella riccia', 'd': 'Calda, con ricotta e canditi', 'p': 3, 'al': ['glutine', 'uova', 'latte'], 'e': '🥐'},
            {'n': 'Delizia al limone', 'd': 'Pan di spagna e crema al limone di Sorrento', 'p': 5, 'al': ['glutine', 'uova', 'latte'], 'e': '🍋', 'isNew': 1}]},
        {'n': 'Bevande', 's': '', 'e': '🥤', 'items': [
            {'n': 'Birra alla spina', 'd': 'Media 0,4 l', 'p': 4.5, 'al': ['glutine'], 'e': '🍺'},
            {'n': 'Vino della casa', 'd': 'Rosso o bianco, 1/4 l', 'p': 4, 'al': ['solfiti'], 'e': '🍷'},
            {'n': 'Limonata', 'd': 'Con limoni della Costiera', 'p': 3.5, 'al': [], 'e': '🍋'},
            {'n': 'Caffè', 'd': 'Espresso napoletano', 'p': 1.3, 'al': [], 'e': '☕'}]},
    ],
)

# =====================================================================
# Ice Lounge – lounge notturno, oro art déco, luci che respirano
# =====================================================================
LOUNGE = dict(
    id='mdc-009', demo_file='mdc-009', demo_name='Ice Lounge', letter='I', theme_color='#0b1020',
    demo_tagline='Cocktail bar · signature & classici', demo_addr='Via dei Mille 21, Milano · Tel. 02 1234567',
    desc='Cocktail bar elegante: luci soffuse, linee oro art déco, drink 3D e scheda con ingredienti e allergeni. Modello di menu digitale con QR code.',
    fonts='cormorantgaramond-inter.css', note=True,
    css=r""":root{--night:#0b1020;--night2:#121a33;--gold:#d8b26e;--gold2:#f3dca8;--ice:#9fe3ff;--ink:#eef2ff;--sub:#9aa6c7;--line:rgba(216,178,110,.28);
--pm-bg:#121a33;--pm-ink:#eef2ff;--pm-sub:#9aa6c7;--pm-accent:#d8b26e;--pm-accent-ink:#0b1020;--pm-head:'Cormorant Garamond',serif;--pm-line:rgba(216,178,110,.3);--pm-art:radial-gradient(70% 70% at 50% 45%,#1d2a52,#0b1020)}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;overflow-x:clip}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);background:var(--night);line-height:1.5;overflow-x:clip}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:8px}
.demo{background:#000;color:var(--gold2);text-align:center;font-size:.74rem;font-weight:700;padding:7px 12px;letter-spacing:.04em}
.wrap{max-width:820px;margin:0 auto;padding:0 18px}
.serif{font-family:'Cormorant Garamond',serif}
/* copertina: luci soffuse che respirano */
.hero{position:relative;color:var(--ink);overflow:hidden}
.hero:not(.dsm-cov){background:radial-gradient(40% 50% at 20% 30%,rgba(159,227,255,.22),transparent 70%),radial-gradient(45% 55% at 85% 20%,rgba(216,178,110,.25),transparent 70%),radial-gradient(60% 60% at 50% 110%,rgba(122,92,255,.25),transparent 70%),var(--night);background-size:160% 160%;animation:breathe 14s ease-in-out infinite alternate}
@keyframes breathe{to{background-position:100% 60%}}
.hero h1{font-family:'Cormorant Garamond',serif;font-weight:600;font-style:italic;font-size:clamp(2.8rem,12vw,5rem);line-height:.95;color:#fff;letter-spacing:.01em}
.hero p{color:var(--gold2);font-size:.8rem;letter-spacing:.32em;text-transform:uppercase;font-weight:600}
.hero .dsm-hd::after{content:"";display:block;width:140px;height:14px;margin:16px auto 0;background:linear-gradient(90deg,transparent,var(--gold) 30%,var(--gold) 70%,transparent) 50% 50%/100% 1px no-repeat,radial-gradient(circle,var(--gold) 0 3px,transparent 4px) 50% 50%/14px 14px no-repeat}
/* categorie: schede con riga oro che scorre */
.navbar{position:sticky;top:0;z-index:20;background:rgba(11,16,32,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.navbar{position:sticky}.cats{position:relative;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;max-width:820px;margin:0 auto;padding:0 10px}
.cats::-webkit-scrollbar{display:none}
.cat{flex:none;border:0;background:none;cursor:pointer;padding:15px 12px;font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:var(--sub);transition:color .3s}
.cat.on{color:var(--gold2)}
.bar{position:absolute;bottom:0;left:0;height:2px;width:0;background:linear-gradient(90deg,var(--gold),var(--gold2));box-shadow:0 0 12px rgba(216,178,110,.7);transition:transform .45s cubic-bezier(.3,1.2,.4,1),width .45s cubic-bezier(.3,1.2,.4,1)}
/* sezioni */
main{padding-top:12px;padding-bottom:30px}
.sec{padding-top:26px}
.sec-h{text-align:center;margin:6px 0 18px}
.sec-h .ill{display:block;width:70px;height:70px;margin:0 auto 4px;animation:float 5s ease-in-out infinite}
.sec-h .ill .pa{width:100%;height:100%;filter:drop-shadow(0 10px 18px rgba(159,227,255,.25))}
@keyframes float{50%{transform:translateY(-6px) rotate(-3deg)}}
.sec-h h2{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:2.2rem;line-height:1;color:#fff;position:relative;display:inline-block;background:linear-gradient(100deg,#fff 40%,var(--gold2) 50%,#fff 60%) 0 0/250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
.sec.in .sec-h h2{animation:shine 2.4s ease .2s 1}
@keyframes shine{from{background-position:100% 0}to{background-position:0 0}}
.sec-h small{display:block;margin-top:6px;color:var(--gold);font-size:.72rem;letter-spacing:.28em;text-transform:uppercase}
.list{display:grid;gap:2px}
.drink{display:flex;gap:14px;align-items:center;width:100%;text-align:left;border:0;background:none;cursor:pointer;padding:14px 6px;border-bottom:1px solid var(--line);border-radius:4px;transition:background .25s}
.drink:hover{background:rgba(255,255,255,.04)}
.glass{flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.18),rgba(255,255,255,.04) 60%);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 0 18px rgba(159,227,255,.12)}
.glass .pa{width:44px;height:44px}
.glass img.pa-photo{width:56px;height:56px;border-radius:50%}
.drink .tx{flex:1;min-width:0}
.drink .row{display:flex;align-items:baseline;gap:8px}
.drink h3{font-family:'Cormorant Garamond',serif;font-weight:600;font-style:italic;font-size:1.42rem;line-height:1.1;color:#fff}
.drink .dots{flex:1;min-width:16px;border-bottom:1px dotted rgba(216,178,110,.5);transform:translateY(-4px)}
.drink .price{flex:none;color:var(--gold2);font-weight:600;font-size:1rem;font-variant-numeric:tabular-nums}
.drink p{color:var(--sub);font-size:.86rem;line-height:1.4;margin-top:3px}
.drink .meta{display:flex;gap:8px;align-items:center;margin-top:5px;font-size:.8rem}
.chip{font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:3px 8px;border:1px solid var(--gold);color:var(--gold2);border-radius:3px}
.drink.sig{background:linear-gradient(90deg,rgba(216,178,110,.10),transparent 70%)}
/* comparsa: dal blu, a fuoco */
.js-rv .rv{opacity:0;transform:translateX(-18px);filter:blur(6px);transition:opacity .7s ease,transform .7s ease,filter .7s ease}
.js-rv .rv.in{opacity:1;transform:none;filter:none}
.note{max-width:784px;margin:0 auto 26px;width:calc(100% - 36px);border:1px solid var(--line);border-radius:6px;padding:14px 16px;font-size:.9rem;color:var(--sub);text-align:center}
.note b{color:var(--gold2)}
""",
    foot_css="footer{background:#070a15;color:var(--sub);border-top:1px solid var(--line)}footer strong{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;color:#fff;font-size:1.8rem}\nfooter .fallergeni{border-top-color:var(--line)!important}\n",
    body="""<div class="navbar"><nav class="cats" id="cats" aria-label="Categorie"></nav><span class="bar" id="bar" aria-hidden="true"></span></div>""",
    js=r"""
var NAV = function (c) { return '<button class="cat" type="button" data-k="' + c.k + '">' + c.n + '</button>'; };
var HEAD = function (c) { return '<div class="sec-h"><span class="ill" aria-hidden="true">' + Piatti.catArt(c) + '</span><h2 id="h' + c.k + '">' + c.n + '</h2><small>' + (c.s || plural(c.items.length)) + '</small></div>'; };
var CARD = function (it, c, i) {
  var lb = tag(it);
  return '<button class="drink rv' + (it.top ? ' sig' : '') + '" type="button" data-c="' + c.k + '" data-i="' + i + '" style="transition-delay:' + (i % 5) * 80 + 'ms">'
    + '<span class="glass">' + Piatti.art(it, c) + '</span><span class="tx"><span class="row"><h3>' + it.n + '</h3><span class="dots"></span><span class="price">' + Piatti.price(it.p) + '</span></span>'
    + (it.d ? '<p>' + it.d + '</p>' : '') + '<span class="meta">' + (lb ? '<span class="chip">' + (it.top ? 'Signature' : lb) + '</span>' : '') + '<span aria-label="Allergeni">' + Piatti.alIcons(it.al) + '</span></span></span></button>';
};
var barB = null, bar = document.getElementById('bar'), navEl = document.getElementById('cats');
function place() { if (!barB) return; bar.style.width = barB.offsetWidth - 24 + 'px'; bar.style.transform = 'translateX(' + (navEl.offsetLeft + barB.offsetLeft - navEl.scrollLeft + 12) + 'px)'; }
var MOVED = function (k, b) { barB = b; place(); };
navEl.addEventListener('scroll', place, { passive: true }); addEventListener('resize', place);
""",
    demo_data=[
        {'n': 'Signature', 's': 'Creati al nostro bancone', 'e': '🍸', 'items': [
            {'n': 'Glacier', 'd': 'Gin, sciroppo di menta glaciale, lime, cubo di ghiaccio trasparente', 'p': 11, 'al': [], 'e': '🍸', 'top': 1},
            {'n': 'Velvet Night', 'd': 'Rum scuro, vermouth, cacao, scorza d’arancia', 'p': 12, 'al': ['latte'], 'e': '🥃', 'top': 1},
            {'n': 'Aurora', 'd': 'Vodka, lampone, lime, top di prosecco', 'p': 11, 'al': ['solfiti'], 'e': '🍹', 'isNew': 1},
            {'n': 'Blue Lagoon', 'd': 'Vodka, curaçao blu, limone, soda', 'p': 10, 'al': [], 'e': '🍸'}]},
        {'n': 'Classici', 's': 'Le ricette che non tramontano', 'e': '🍸', 'items': [
            {'n': 'Negroni', 'd': 'Gin, bitter, vermouth rosso', 'p': 9, 'al': ['solfiti'], 'e': '🥃'},
            {'n': 'Moscow Mule', 'd': 'Vodka, ginger beer, lime', 'p': 9, 'al': [], 'e': '🍹'},
            {'n': 'Margarita', 'd': 'Tequila, triple sec, lime, sale', 'p': 9, 'al': [], 'e': '🍸'},
            {'n': 'Old Fashioned', 'd': 'Bourbon, zucchero, angostura, arancia', 'p': 10, 'al': [], 'e': '🥃'}]},
        {'n': 'Spritz e vini', 's': 'Per l’aperitivo', 'e': '🍷', 'items': [
            {'n': 'Spritz', 'd': 'Aperitivo, prosecco, soda', 'p': 7, 'al': ['solfiti'], 'e': '🍹'},
            {'n': 'Calice di bollicine', 'd': 'Franciacorta brut', 'p': 8, 'al': ['solfiti'], 'e': '🥂'},
            {'n': 'Calice di rosso', 'd': 'Nebbiolo delle Langhe', 'p': 7, 'al': ['solfiti'], 'e': '🍷'}]},
        {'n': 'Analcolici', 's': 'Zero alcol, tanto gusto', 'e': '🧃', 'items': [
            {'n': 'Virgin Mojito', 'd': 'Menta, lime, zucchero di canna, soda', 'p': 6, 'al': [], 'e': '🍹'},
            {'n': 'Ginger Fizz', 'd': 'Zenzero, limone, miele, acqua tonica', 'p': 6, 'al': [], 'e': '🍋'}]},
        {'n': 'Da stuzzicare', 's': 'Con il drink', 'e': '🫒', 'items': [
            {'n': 'Tagliere di salumi', 'd': 'Salumi italiani, grissini, focaccia', 'p': 14, 'al': ['glutine'], 'e': '🧀'},
            {'n': 'Olive e mandorle', 'd': 'Olive taggiasche e mandorle tostate', 'p': 5, 'al': ['frutta'], 'e': '🫒'}]},
    ],
)

# =====================================================================
# Smash Lab – street food a fumetti: adesivi, strisce che scorrono, carte che "sbattono"
# =====================================================================
SMASH = dict(
    id='mdc-010', demo_file='mdc-010', demo_name='Smash Lab', letter='S', theme_color='#ffd23f',
    demo_tagline='Smash burger · patatine · shake', demo_addr='Via Emilia 120, Bologna · Tel. 051 123456',
    desc='Hamburgeria street food: adesivi, strisce che scorrono, burger 3D e scheda con allergeni. Modello di menu digitale con QR code.',
    fonts='bowlbyone-inter.css', note=True,
    css=r""":root{--yel:#ffd23f;--red:#ff3b30;--blk:#111;--cream:#fff8e7;--ink:#111;--sub:#4a4a4a;
--pm-bg:#fff8e7;--pm-ink:#111;--pm-sub:#4a4a4a;--pm-accent:#ff3b30;--pm-accent-ink:#fff;--pm-head:'Bowlby One',sans-serif;--pm-line:#111;--pm-art:radial-gradient(70% 70% at 50% 45%,#fff3c4,#ffd23f)}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;overflow-x:clip}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);background:var(--cream);line-height:1.5;overflow-x:clip}
button{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--red);outline-offset:3px;border-radius:10px}
.demo{background:var(--blk);color:var(--yel);text-align:center;font-size:.74rem;font-weight:800;padding:7px 12px}
.wrap{max-width:860px;margin:0 auto;padding:0 16px}
.bw{font-family:'Bowlby One',Impact,sans-serif;font-weight:400}
/* copertina gialla a puntini */
.hero{position:relative;overflow:hidden;color:var(--blk)}
.hero:not(.dsm-cov){background:var(--yel) radial-gradient(rgba(0,0,0,.12) 2px,transparent 2.6px) 0 0/20px 20px}
.hero h1{font-family:'Bowlby One',Impact,sans-serif;font-weight:400;font-size:clamp(2.5rem,12vw,4.8rem);line-height:.92;text-transform:uppercase;color:var(--blk);text-shadow:4px 4px 0 var(--red);transform:rotate(-2deg)}
.hero.dsm-cov h1{color:#fff;text-shadow:4px 4px 0 var(--red),0 6px 24px rgba(0,0,0,.45)}
.hero .dsm-hd>p{display:inline-block;margin-top:22px!important;background:var(--blk);color:var(--yel);font-weight:800;font-size:.88rem;letter-spacing:.06em;text-transform:uppercase;padding:6px 14px;border-radius:999px;transform:rotate(1.5deg)}
.hero.dsm-cov p{text-shadow:none}
/* striscia che scorre */
.tape{background:var(--blk);color:var(--yel);overflow:hidden;white-space:nowrap;border-block:3px solid var(--blk)}
.tape span{display:inline-block;padding:9px 0;font-family:'Bowlby One',sans-serif;font-size:1rem;letter-spacing:.04em;animation:tape 26s linear infinite}
@keyframes tape{to{transform:translateX(-50%)}}
/* categorie: adesivi */
.navbar{position:sticky;top:0;z-index:20;background:var(--cream);border-bottom:3px solid var(--blk)}
.cats{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding:12px 16px;max-width:860px;margin:0 auto}
.cats::-webkit-scrollbar{display:none}
.cat{flex:none;display:flex;align-items:center;gap:6px;border:3px solid var(--blk);background:#fff;border-radius:14px;padding:6px 12px 6px 8px;font-weight:900;font-size:.88rem;text-transform:uppercase;cursor:pointer;box-shadow:3px 3px 0 var(--blk);transform:rotate(var(--r,0deg));transition:transform .25s cubic-bezier(.3,1.6,.5,1),background .2s}
.cat .pa{width:26px;height:26px}
.cat.on{background:var(--red);color:#fff;transform:rotate(0) scale(1.06)}
/* sezioni */
main{padding-top:6px;padding-bottom:30px}
.sec{padding-top:22px}
.sec-h{display:flex;align-items:center;gap:12px;margin:6px 0 16px}
.sec-h .ill{flex:none;width:64px;height:64px;border:3px solid var(--blk);border-radius:50%;background:var(--yel);display:grid;place-items:center;box-shadow:3px 3px 0 var(--blk)}
.sec-h .ill .pa{width:46px;height:46px}
.sec-h h2{font-family:'Bowlby One',sans-serif;font-weight:400;font-size:1.8rem;line-height:1;text-transform:uppercase}
.sec-h small{display:block;font-weight:700;color:var(--sub);font-size:.85rem;margin-top:4px}
.list{display:grid;gap:16px}
@media (min-width:700px){.list{grid-template-columns:1fr 1fr}}
.card{position:relative;display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:#fff;border:3px solid var(--blk);border-radius:18px;padding:12px 12px 12px 10px;cursor:pointer;box-shadow:6px 6px 0 var(--blk);transition:transform .15s,box-shadow .15s}
.card:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 var(--blk)}
.card:active{transform:translate(4px,4px);box-shadow:2px 2px 0 var(--blk)}
.bun{flex:none;width:78px;height:78px;border-radius:50%;background:var(--yel);border:3px solid var(--blk);display:grid;place-items:center;overflow:hidden}
.bun .pa{width:60px;height:60px}
.bun img.pa-photo{width:100%;height:100%;border-radius:50%}
.card .tx{flex:1;min-width:0;padding-right:58px}
.card h3{font-family:'Bowlby One',sans-serif;font-weight:400;font-size:1.06rem;line-height:1.1;text-transform:uppercase}
.card p{color:var(--sub);font-size:.86rem;line-height:1.35;margin-top:4px}
.card .meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:.85rem}
.chip{font-size:.68rem;font-weight:900;text-transform:uppercase;padding:3px 8px;border-radius:6px;background:var(--blk);color:var(--yel)}
.chip.hot{background:var(--red);color:#fff}
.sticker{position:absolute;top:-12px;right:-8px;min-width:62px;text-align:center;font-family:'Bowlby One',sans-serif;font-size:1rem;color:#fff;background:var(--red);border:3px solid var(--blk);border-radius:12px;padding:6px 8px;transform:rotate(6deg);box-shadow:3px 3px 0 var(--blk)}
/* le carte "sbattono" sul tavolo, l'adesivo del prezzo si stacca e si riattacca */
.js-rv .rv{opacity:0;transform:scale(1.18) rotate(-3deg)}
.js-rv .rv.in{opacity:1;transform:none;animation:slam .55s cubic-bezier(.2,1.6,.4,1) both}
.js-rv .rv.in .sticker{animation:peel .8s .35s ease both}
@keyframes slam{0%{opacity:0;transform:scale(1.18) rotate(-3deg)}60%{opacity:1;transform:scale(.97) rotate(.6deg)}100%{transform:none}}
@keyframes peel{0%{transform:rotate(6deg) scale(1)}40%{transform:rotate(-8deg) scale(1.15)}100%{transform:rotate(6deg) scale(1)}}
.note{max-width:828px;margin:0 auto 26px;width:calc(100% - 32px);background:#fff;border:3px solid var(--blk);border-radius:16px;padding:14px 16px;font-size:.92rem;box-shadow:5px 5px 0 var(--yel)}
""",
    foot_css="footer{background:var(--blk);color:#fff}footer strong{font-family:'Bowlby One',sans-serif;font-weight:400;color:var(--yel);text-transform:uppercase}\nfooter .fallergeni{border-top-color:rgba(255,255,255,.3)!important}\n",
    body="""<div class="tape" aria-hidden="true"><span id="tape"></span></div>
<div class="navbar"><nav class="cats" id="cats" aria-label="Categorie"></nav></div>""",
    js=r"""
var NAV = function (c) { return '<button class="cat" type="button" data-k="' + c.k + '" style="--r:' + ((c.k % 3) - 1) * 2 + 'deg">' + Piatti.catArt(c) + '<span>' + c.n + '</span></button>'; };
var HEAD = function (c) { return '<div class="sec-h"><span class="ill" aria-hidden="true">' + Piatti.catArt(c) + '</span><div><h2 id="h' + c.k + '">' + c.n + '</h2><small>' + (c.s ? c.s + ' · ' : '') + plural(c.items.length) + '</small></div></div>'; };
var CARD = function (it, c, i) {
  var lb = tag(it);
  return '<button class="card rv" type="button" data-c="' + c.k + '" data-i="' + i + '" style="animation-delay:' + (i % 4) * 90 + 'ms">'
    + '<span class="bun">' + Piatti.art(it, c) + '</span><span class="tx"><h3>' + it.n + '</h3>' + (it.d ? '<p>' + it.d + '</p>' : '')
    + '<span class="meta">' + (lb ? '<span class="chip' + (it.hot ? ' hot' : '') + '">' + lb + '</span>' : '') + '<span aria-label="Allergeni">' + Piatti.alIcons(it.al) + '</span></span></span>'
    + '<span class="sticker">' + Piatti.price(it.p) + '</span></button>';
};
/* striscia: le categorie del locale che scorrono */
var tp = M.map(function (c) { return (c.e || '🍔') + ' ' + String(c.n).replace(/<[^>]+>/g, '').toUpperCase(); }).join('   ') + '   ';
document.getElementById('tape').textContent = Array(9).join(tp);
""",
    demo_data=[
        {'n': 'Smash burger', 's': 'Doppia carne schiacciata sulla piastra', 'e': '🍔', 'items': [
            {'n': 'Classic Smash', 'd': 'Doppio smash, cheddar, cipolla, pickles, salsa della casa', 'p': 10, 'al': ['glutine', 'latte', 'senape', 'uova'], 'e': '🍔', 'top': 1},
            {'n': 'Bacon Bomb', 'd': 'Doppio smash, bacon croccante, cheddar, salsa bbq', 'p': 12, 'al': ['glutine', 'latte', 'senape'], 'e': '🥓'},
            {'n': 'Hot Diablo', 'd': 'Smash, jalapeño, pepper jack, salsa piccante', 'p': 11, 'al': ['glutine', 'latte', 'uova'], 'e': '🌶️', 'hot': 1},
            {'n': 'Green Smash', 'd': 'Burger vegetale, insalata, pomodoro, maionese vegana', 'p': 11, 'al': ['glutine', 'soia', 'senape'], 'e': '🥬', 'veg': 1, 'isNew': 1}]},
        {'n': 'Fritti', 's': 'Croccanti, appena fatti', 'e': '🍟', 'items': [
            {'n': 'Patatine', 'd': 'Con buccia, sale affumicato', 'p': 4, 'al': [], 'e': '🍟', 'veg': 1},
            {'n': 'Cheese fries', 'd': 'Patatine, salsa cheddar, bacon', 'p': 6.5, 'al': ['latte'], 'e': '🧀'},
            {'n': 'Onion rings', 'd': 'Anelli di cipolla in pastella di birra', 'p': 5, 'al': ['glutine'], 'e': '🧅', 'veg': 1},
            {'n': 'Alette piccanti', 'd': '6 alette con salsa buffalo', 'p': 7, 'al': ['latte', 'sedano'], 'e': '🍗', 'hot': 1}]},
        {'n': 'Shake', 's': 'Frullati densi da cannuccia', 'e': '🥤', 'items': [
            {'n': 'Vaniglia', 'd': 'Gelato alla vaniglia, panna montata', 'p': 5.5, 'al': ['latte'], 'e': '🥤'},
            {'n': 'Cioccolato e biscotto', 'd': 'Cacao, biscotti al cioccolato, panna', 'p': 6, 'al': ['latte', 'glutine', 'soia'], 'e': '🍫'}]},
        {'n': 'Bibite', 's': '', 'e': '🥤', 'items': [
            {'n': 'Birra artigianale', 'd': 'IPA 0,33 l', 'p': 5, 'al': ['glutine'], 'e': '🍺'},
            {'n': 'Cola, aranciata, limonata', 'd': 'Lattina 0,33 l', 'p': 3, 'al': [], 'e': '🥤'}]},
    ],
)

MODELS = [NAPOLI, LOUNGE, SMASH]
if __name__ == '__main__':
    for T in MODELS:
        (DSMENU / 'themes' / f"{T['id']}.html").write_text(page(T, False))
        (DSFABIO / f"{T['demo_file']}.html").write_text(page(T, True))
        print('ok', T['id'])
