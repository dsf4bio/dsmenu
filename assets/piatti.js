/* =========================================================
   DS Service · Piatti illustrati e animati + scheda piatto (popup)
   Uso:
     Piatti.svg('pasta', {s:'#d8432f'})  → stringa <svg> animata
     Piatti.modal(lista, indice, elementoDiOrigine)  → apre la scheda
     Piatti.art(piatto, categoria)  → foto del locale, disegno scelto o indovinato dal nome, oppure emoji
   I testi dei piatti sono già sicuri per l'HTML (su dsmenu.it li rende sicuri il server):
   qui non vengono trasformati di nuovo.
   Il popup prende i colori dalle variabili CSS della pagina:
     --pm-bg --pm-ink --pm-sub --pm-accent --pm-accent-ink --pm-art --pm-head --pm-line
   ========================================================= */
(function () {
'use strict';
var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
var uid = 0;

/* ---------- Allergeni (14 UE) ---------- */
var AL = {
  glutine: ['🌾', 'Glutine'], crostacei: ['🦐', 'Crostacei'], uova: ['🥚', 'Uova'], pesce: ['🐟', 'Pesce'],
  arachidi: ['🥜', 'Arachidi'], soia: ['🫘', 'Soia'], latte: ['🥛', 'Latte'], frutta: ['🌰', 'Frutta a guscio'],
  sedano: ['🥬', 'Sedano'], senape: ['🟡', 'Senape'], sesamo: ['⚪', 'Sesamo'], solfiti: ['🍷', 'Solfiti'],
  lupini: ['🌼', 'Lupini'], molluschi: ['🐚', 'Molluschi']
};

/* ---------- Animazioni condivise ---------- */
var CSS = [
'.pa{display:block;width:100%;height:auto;overflow:visible}',
'img.pa-photo{aspect-ratio:1;object-fit:cover;border-radius:22%;box-shadow:0 10px 24px rgba(0,0,0,.25)}',
'.pm-art img.pa-photo{border-radius:20px}',
'img.pa-3d{aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,0,.22));animation:pa3d 4.5s ease-in-out infinite}',
'@keyframes pa3d{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
'@media (prefers-reduced-motion:reduce){img.pa-3d{animation:none}}',
'.pa [class*="pa-"]{transform-box:fill-box}',
'.pa-steam{fill:none;stroke:#fff;stroke-width:4;stroke-linecap:round;opacity:0;transform-origin:50% 100%;animation:pa-steam 3.2s ease-in-out infinite}',
'@keyframes pa-steam{0%{opacity:0;transform:translateY(8px) scaleY(.7)}30%{opacity:.6}100%{opacity:0;transform:translateY(-30px) scaleY(1.2)}}',
'.pa-smoke{fill:none;stroke:#cfc8c0;stroke-width:6;stroke-linecap:round;opacity:0;transform-origin:50% 100%;animation:pa-steam 4s ease-in-out infinite}',
'.pa-spin{transform-origin:50% 50%;animation:pa-spin 40s linear infinite}',
'.pa-spin-f{transform-origin:50% 50%;animation:pa-spin 9s linear infinite}',
'@keyframes pa-spin{to{transform:rotate(360deg)}}',
'.pa-bub{transform-origin:50% 50%;animation:pa-bub 2.4s ease-in-out infinite}',
'@keyframes pa-bub{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}',
'.pa-pop{transform-origin:50% 50%;animation:pa-pop 2.2s ease-in infinite}',
'@keyframes pa-pop{0%{transform:scale(0);opacity:0}20%{opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(1.4);opacity:0}}',
'.pa-rise{animation:pa-rise 2.6s linear infinite}',
'@keyframes pa-rise{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(-70px);opacity:0}}',
'.pa-fall{animation:pa-fall 2.8s linear infinite}',
'@keyframes pa-fall{0%{transform:translateY(-30px);opacity:0}20%{opacity:1}100%{transform:translateY(40px);opacity:0}}',
'.pa-wob{transform-origin:50% 100%;animation:pa-wob 2.6s ease-in-out infinite}',
'@keyframes pa-wob{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}',
'.pa-sway{transform-origin:50% 100%;animation:pa-sway 3.4s ease-in-out infinite}',
'@keyframes pa-sway{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(4deg) translateY(-2px)}}',
'.pa-bob{animation:pa-bob 1.8s ease-in-out infinite}',
'@keyframes pa-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
'.pa-bounce{transform-origin:50% 100%;animation:pa-bounce 1.6s cubic-bezier(.3,1.5,.5,1) infinite}',
'@keyframes pa-bounce{0%,100%{transform:scale(1,1)}40%{transform:scale(1.04,.95)}60%{transform:scale(.97,1.05) translateY(-4px)}}',
'.pa-drip{transform-origin:50% 0;animation:pa-drip 3s ease-in-out infinite}',
'@keyframes pa-drip{0%,100%{transform:scaleY(.6)}50%{transform:scaleY(1.15)}}',
'.pa-tw{transform-origin:50% 50%;animation:pa-tw 1.8s ease-in-out infinite}',
'@keyframes pa-tw{0%,100%{transform:scale(.2) rotate(0);opacity:0}50%{transform:scale(1) rotate(45deg);opacity:1}}',
'.pa-blink{transform-origin:50% 50%;animation:pa-blink 3.5s infinite}',
'@keyframes pa-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}',
'.pa-jelly{transform-origin:50% 100%;animation:pa-jelly 2s ease-in-out infinite}',
'@keyframes pa-jelly{0%,100%{transform:skewX(0) scale(1,1)}25%{transform:skewX(4deg) scale(1.03,.97)}75%{transform:skewX(-4deg) scale(.97,1.03)}}',
'.pa-swirl{transform-origin:50% 50%;animation:pa-swirl 3s ease-in-out infinite}',
'@keyframes pa-swirl{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}',
'.pa-shine{animation:pa-shine 3.4s ease-in-out infinite}',
'@keyframes pa-shine{0%,40%{transform:translateX(-140px)}80%,100%{transform:translateX(160px)}}',
'.pa-stretch{transform-origin:50% 0;animation:pa-stretch 2.4s ease-in-out infinite}',
'@keyframes pa-stretch{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}',
'.pa-wig{transform-origin:50% 100%;animation:pa-wig 1.2s ease-in-out infinite}',
'@keyframes pa-wig{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}',
'.pa-sizzle{animation:pa-sizzle .9s steps(2) infinite}',
'@keyframes pa-sizzle{50%{opacity:.2}}',
'@media (prefers-reduced-motion:reduce){.pa *{animation:none!important}.pa-steam,.pa-smoke{opacity:.35}}',

/* Popup scheda piatto */
'.pm{border:0;padding:0;margin:auto;width:calc(100% - 24px);max-width:440px;max-height:calc(100dvh - 32px);border-radius:var(--pm-radius,26px);background:var(--pm-bg,#fff);color:var(--pm-ink,#1b1638);overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.55);display:flex;flex-direction:column}',
'.pm:not([open]){display:none}',
'.pm::backdrop{background:rgba(8,6,16,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
'.pm-art{position:relative;flex:0 0 auto;height:min(290px,40dvh);display:grid;place-items:center;background:var(--pm-art,radial-gradient(70% 70% at 50% 40%,#fff6e6,#f1dcc0));overflow:hidden}',
'.pm-pic{width:100%;height:100%;display:grid;place-items:center}',
'.pm-art .pa{width:auto;height:88%;max-width:88%}',
'.pm-x{position:absolute;top:12px;right:12px;z-index:3;width:42px;height:42px;border-radius:50%;border:0;cursor:pointer;font-size:1.5rem;line-height:1;background:rgba(255,255,255,.85);color:#1b1638;box-shadow:0 6px 18px rgba(0,0,0,.2)}',
'.pm-nav{position:absolute;top:50%;z-index:3;width:40px;height:40px;margin-top:-20px;border-radius:50%;border:0;cursor:pointer;font-size:1.3rem;font-weight:800;background:rgba(255,255,255,.75);color:#1b1638}',
'.pm-prev{left:10px}.pm-next{right:10px}',
'.pm-body{padding:20px 22px 22px;overflow-y:auto}',
'.pm-cat{font-size:.72rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--pm-accent,#7b5cff)}',
'.pm-head{display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin:4px 0 8px}',
'.pm-head h2{font-family:var(--pm-head,inherit);font-size:1.6rem;line-height:1.1;margin:0}',
'.pm-price{flex:0 0 auto;font-family:var(--pm-head,inherit);font-size:1.4rem;font-weight:800;padding:4px 12px;border-radius:999px;background:var(--pm-accent,#7b5cff);color:var(--pm-accent-ink,#fff)}',
'.pm-desc{color:var(--pm-sub,#5a5470);font-size:.98rem;line-height:1.5;margin:0 0 14px}',
'.pm-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}',
'.pm-tags span{font-size:.75rem;font-weight:800;padding:4px 10px;border-radius:999px;background:rgba(127,127,127,.12)}',
'.pm-al h3{font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:0 0 8px;color:var(--pm-sub,#5a5470)}',
'.pm-al ul{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0}',
'.pm-al li{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:12px;border:1px solid var(--pm-line,rgba(127,127,127,.25));font-size:.86rem;font-weight:700}',
'.pm-al .none{color:var(--pm-sub,#5a5470);font-size:.9rem}',
'.pm-note{margin:14px 0 0;font-size:.74rem;color:var(--pm-sub,#5a5470)}',
'.pm-in{animation:pm-in .5s cubic-bezier(.2,.9,.2,1)}',
'@keyframes pm-in{from{opacity:0;transform:translateY(16px)}}',
'.pm-swap .pm-body,.pm-swap .pm-art .pa{animation:pm-in .4s cubic-bezier(.2,.9,.2,1)}'
].join('\n');
var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

/* ---------- Utilità di disegno ---------- */
function rng(seed) { var s = seed; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function steam(xs, y) {
  return xs.map(function (x, k) {
    return '<path class="pa-steam" style="animation-delay:' + (k * 0.9) + 's" d="M' + x + ' ' + y + 'c-7-8 7-14 0-22s7-14 0-22"/>';
  }).join('');
}
function plate(cy, c) {
  c = c || {};
  return '<ellipse cx="100" cy="' + (cy + 8) + '" rx="88" ry="20" fill="#000" opacity=".14"/>' +
    '<ellipse cx="100" cy="' + cy + '" rx="88" ry="38" fill="' + (c.rim || '#f4f1ec') + '"/>' +
    '<ellipse cx="100" cy="' + (cy - 2) + '" rx="64" ry="25" fill="' + (c.in || '#e6e1d8') + '"/>' +
    '<ellipse cx="100" cy="' + (cy - 3) + '" rx="62" ry="23" fill="' + (c.in2 || '#efebe4') + '"/>';
}
function leaf(x, y, r, c, cls, d) {
  return '<g class="' + (cls || 'pa-wob') + '" style="animation-delay:' + (d || 0) + 's"><path transform="translate(' + x + ' ' + y + ') rotate(' + r + ')" d="M0 0c6-8 16-8 20 0-6 6-14 6-20 0z" fill="' + (c || '#3f9a3a') + '"/></g>';
}
function sparkle(x, y, d, c) {
  return '<path class="pa-tw" style="animation-delay:' + d + 's" d="M' + x + ' ' + (y - 6) + 'l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill="' + (c || '#fff') + '"/>';
}
function bubbles(x0, x1, y, n, c, seed) {
  var r = rng(seed || 7), h = '';
  for (var i = 0; i < n; i++) h += '<circle class="pa-rise" style="animation-delay:' + (r() * 2.6).toFixed(2) + 's" cx="' + (x0 + r() * (x1 - x0)).toFixed(1) + '" cy="' + y + '" r="' + (1.4 + r() * 2).toFixed(1) + '" fill="' + (c || 'rgba(255,255,255,.75)') + '"/>';
  return h;
}

/* ---------- I piatti ---------- */
var D = {};

D.pasta = function (o, g) {
  var s = o.s || '#d8432f', n = o.n || '#f2cf72', h = plate(128), r = rng(3);
  h += '<ellipse cx="100" cy="118" rx="52" ry="27" fill="' + n + '"/>';
  var ys = [104, 110, 116, 122, 128, 113, 107];
  ys.forEach(function (y, k) {
    var x = 54 + (k % 3) * 4, w = 88 - (k % 3) * 8;
    h += '<path d="M' + x + ' ' + y + 'q' + (w / 8) + ' -12 ' + (w / 4) + ' 0t' + (w / 4) + ' 0t' + (w / 4) + ' 0t' + (w / 4) + ' 0" fill="none" stroke="' + (o.n2 || '#e0b350') + '" stroke-width="3.2" stroke-linecap="round" opacity=".9"/>';
  });
  if (!o.white) {
    h += '<path d="M76 106c4-12 44-14 50-2 6 12-8 18-24 18s-30-4-26-16z" fill="' + s + '"/>';
    h += '<ellipse cx="96" cy="104" rx="9" ry="4" fill="#fff" opacity=".35"/>';
  }
  for (var i = 0; i < 9; i++) h += '<circle cx="' + (70 + r() * 60).toFixed(1) + '" cy="' + (100 + r() * 24).toFixed(1) + '" r="1.6" fill="' + (o.dots || '#fff8e0') + '"/>';
  if (o.extra === 'pancetta') for (var j = 0; j < 6; j++) h += '<rect x="' + (68 + j * 11) + '" y="' + (104 + (j % 2) * 10) + '" width="8" height="6" rx="2" fill="#c9644c" class="pa-bob" style="animation-delay:' + j * .2 + 's"/>';
  if (o.extra === 'cozze') for (var m = 0; m < 4; m++) h += '<g class="pa-bob" style="animation-delay:' + m * .3 + 's"><ellipse cx="' + (66 + m * 22) + '" cy="' + (108 + (m % 2) * 12) + '" rx="10" ry="5.5" fill="#2b2a3a" transform="rotate(' + (m * 30 - 30) + ' ' + (66 + m * 22) + ' ' + (108 + (m % 2) * 12) + ')"/><ellipse cx="' + (66 + m * 22) + '" cy="' + (108 + (m % 2) * 12) + '" rx="6" ry="3" fill="#f0a35a"/></g>';
  h += leaf(98, 96, -30, '#3f9a3a', 'pa-wob', 0) + leaf(108, 98, 20, '#4fb043', 'pa-wob', .6);
  h += steam([80, 100, 120], 92);
  return h;
};

D.risotto = function (o) {
  var h = plate(128), r = rng(11), c = o.c || '#f1c94b';
  h += '<ellipse cx="100" cy="120" rx="54" ry="26" fill="' + c + '"/>';
  for (var i = 0; i < 80; i++) {
    var a = r() * 6.28, d = Math.sqrt(r());
    var gx = (100 + Math.cos(a) * d * 48).toFixed(1), gy = (120 + Math.sin(a) * d * 22).toFixed(1);
    h += '<ellipse cx="' + gx + '" cy="' + gy + '" rx="2.6" ry="1.4" fill="#fff6d4" opacity=".75" transform="rotate(' + (r() * 180).toFixed(0) + ' ' + gx + ' ' + gy + ')"/>';
  }
  if (o.top === 'funghi') for (var m = 0; m < 5; m++) h += '<g class="pa-bob" style="animation-delay:' + m * .3 + 's"><path d="M' + (72 + m * 13) + ' ' + (116 + (m % 2) * 6) + 'a8 6 0 0 1 16 0z" fill="#8a5a3b"/><rect x="' + (77 + m * 13) + '" y="' + (115 + (m % 2) * 6) + '" width="6" height="7" rx="2" fill="#efe1c9"/></g>';
  for (var p = 0; p < 10; p++) h += '<circle cx="' + (72 + r() * 56).toFixed(1) + '" cy="' + (108 + r() * 22).toFixed(1) + '" r="2" fill="#3f9a3a"/>';
  h += steam([84, 104, 122], 98);
  return h;
};

D.zuppa = function (o) {
  var c = o.c || '#c8742f', h = '<ellipse cx="100" cy="168" rx="74" ry="12" fill="#000" opacity=".14"/>';
  h += '<path d="M28 100q4 64 72 66 68-2 72-66z" fill="' + (o.bowl || '#8a4a2b') + '"/><path d="M40 112q10 44 60 46" stroke="#fff" stroke-opacity=".15" stroke-width="6" fill="none" stroke-linecap="round"/>';
  h += '<ellipse cx="100" cy="100" rx="72" ry="24" fill="' + (o.rim || '#6e3a22') + '"/><ellipse cx="100" cy="101" rx="64" ry="19" fill="' + c + '"/>';
  var r = rng(5);
  for (var i = 0; i < 6; i++) h += '<circle class="pa-pop" style="animation-delay:' + (i * .37).toFixed(2) + 's" cx="' + (60 + r() * 80).toFixed(0) + '" cy="' + (94 + r() * 12).toFixed(0) + '" r="' + (2 + r() * 3).toFixed(1) + '" fill="#fff" fill-opacity=".45"/>';
  if (o.top === 'crostini') for (var k = 0; k < 4; k++) h += '<rect class="pa-bob" style="animation-delay:' + k * .4 + 's" x="' + (66 + k * 18) + '" y="' + (94 + (k % 2) * 6) + '" width="11" height="9" rx="2" fill="#e2b46a"/>';
  if (o.top === 'fagioli') for (var f = 0; f < 7; f++) h += '<ellipse cx="' + (64 + f * 12) + '" cy="' + (98 + (f % 3) * 4) + '" rx="4.5" ry="3" fill="#7a3b2a"/>';
  h += leaf(96, 92, -20, '#4fb043', 'pa-wob', .3);
  h += steam([78, 100, 122], 86);
  return h;
};

D.lasagna = function () {
  var h = plate(140);
  h += '<path d="M54 92l60-12 34 16-60 13z" fill="#e7b04f"/>';
  var cols = ['#f1d27a', '#c2412c', '#fbf3df', '#f1d27a', '#c2412c', '#fbf3df', '#e9b95a'];
  cols.forEach(function (c, k) { h += '<path d="M54 ' + (92 + k * 6) + 'l34 17 0 6-34-17z" fill="' + c + '"/><path d="M88 ' + (109 + k * 6) + 'l60-13 0 6-60 13z" fill="' + c + '" opacity=".88"/>'; });
  h += '<circle cx="92" cy="92" r="6" fill="#b5652a" opacity=".6"/><circle cx="118" cy="90" r="4" fill="#b5652a" opacity=".6"/><circle cx="104" cy="98" r="3" fill="#b5652a" opacity=".5"/>';
  h += '<path class="pa-drip" d="M60 100q4 0 4 8 0 6-4 6t-4-6q0-8 4-8z" fill="#fbf3df"/>';
  h += '<path class="pa-drip" style="animation-delay:1s" d="M138 104q3 0 3 6 0 5-3 5t-3-5q0-6 3-6z" fill="#c2412c"/>';
  h += leaf(100, 84, -15, '#3f9a3a', 'pa-wob', 0);
  h += steam([84, 106, 126], 80);
  return h;
};

D.tagliata = function () {
  var h = plate(130, {in2: '#f3eee6'});
  h += '<ellipse cx="100" cy="128" rx="50" ry="18" fill="#7fae4a"/>';
  for (var i = 0; i < 5; i++) {
    var x = 62 + i * 16;
    h += '<g transform="rotate(-18 ' + x + ' 116)"><rect x="' + (x - 8) + '" y="102" width="15" height="30" rx="5" fill="#6b2f1f"/><rect x="' + (x - 6) + '" y="105" width="11" height="24" rx="4" fill="#c4554a"/><rect x="' + (x - 3) + '" y="108" width="5" height="18" rx="2" fill="#e88a7c"/></g>';
  }
  h += '<path d="M66 98q30-14 64-4" stroke="#3f7a2a" stroke-width="2.5" fill="none"/>';
  for (var k = 0; k < 7; k++) h += '<path d="M' + (70 + k * 9) + ' ' + (95 - (k % 3)) + 'l-4-7m4 7l4-7" stroke="#4f9a3a" stroke-width="2" stroke-linecap="round"/>';
  h += sparkle(78, 110, 0) + sparkle(118, 104, .6) + sparkle(98, 124, 1.2);
  h += '<path class="pa-smoke" d="M90 88c-7-8 7-14 0-22s7-14 0-22"/><path class="pa-smoke" style="animation-delay:1.6s" d="M114 90c-7-8 7-14 0-22s7-14 0-22"/>';
  return h;
};

D.pesce = function () {
  var h = plate(132, {rim: '#eef3f6', in: '#dde6ec', in2: '#e8eff3'});
  h += '<path d="M44 124q28-30 86-12l22-14-4 26 4 26-22-14q-58 18-86-12z" fill="#b8c4cc"/>';
  h += '<path d="M44 124q28-30 86-12q-40 6-86 12z" fill="#dfe7ec"/>';
  for (var i = 0; i < 4; i++) h += '<path d="M' + (72 + i * 14) + ' 112l-8 22" stroke="#6b5a4a" stroke-width="2.4" opacity=".55" stroke-linecap="round"/>';
  h += '<g class="pa-blink"><circle cx="58" cy="120" r="4.5" fill="#fff"/><circle cx="58" cy="120" r="2.4" fill="#1b1638"/></g>';
  h += '<g class="pa-bob"><path d="M118 144a14 14 0 0 1 26 0z" fill="#f6d33c"/><path d="M121 144a11 11 0 0 1 20 0z" fill="#fbe98a"/></g>';
  h += leaf(126, 104, 30, '#4fb043', 'pa-wob', .2);
  h += steam([80, 104], 98);
  return h;
};

D.insalata = function () {
  var h = '<ellipse cx="100" cy="164" rx="72" ry="12" fill="#000" opacity=".14"/>';
  h += '<path d="M30 108q6 54 70 56 64-2 70-56z" fill="#b07a46"/><path d="M42 118q12 38 58 40" stroke="#fff" stroke-opacity=".18" stroke-width="5" fill="none" stroke-linecap="round"/>';
  h += '<ellipse cx="100" cy="108" rx="70" ry="22" fill="#8c5a30"/>';
  var cs = ['#3f9a3a', '#6cc04a', '#2f7d2f', '#8fd16a', '#4fb043', '#3f9a3a', '#6cc04a'];
  cs.forEach(function (c, k) { h += '<g class="pa-sway" style="animation-delay:' + (k * .35) + 's"><path d="M' + (46 + k * 17) + ' 108c-6-26 18-34 22-10 2 10-8 14-22 10z" fill="' + c + '"/></g>'; });
  h += '<g class="pa-bob"><circle cx="76" cy="98" r="9" fill="#e5392b"/><circle cx="76" cy="98" r="5" fill="#ff7b6b"/></g><g class="pa-bob" style="animation-delay:.5s"><circle cx="124" cy="96" r="8" fill="#e5392b"/><circle cx="124" cy="96" r="4.5" fill="#ff7b6b"/></g>';
  h += '<g class="pa-bob" style="animation-delay:.9s"><ellipse cx="100" cy="92" rx="10" ry="7" fill="#fbf7ec"/></g><circle cx="140" cy="104" r="4" fill="#2a2a2a"/><circle cx="62" cy="106" r="4" fill="#2a2a2a"/>';
  return h;
};

D.pizza = function (o) {
  /* Sempre uno spicchio: la pizza intera è tonda come il piatto e si legge male */
  var sauce = o.white ? '#f6ead0' : '#cf3a26', r = rng(o.seed || 9), id = o.id + 'c';
  var CX = 100, CY = 184, A = 0.42;
  function pt(rad, ang) { return (CX + Math.sin(ang) * rad).toFixed(1) + ' ' + (CY - Math.cos(ang) * rad).toFixed(1); }
  function wedge(rad, a) { return 'M' + CX + ' ' + CY + 'L' + pt(rad, -a) + 'A' + rad + ' ' + rad + ' 0 0 1 ' + pt(rad, a) + 'Z'; }
  function at(rad, ang) { return 'translate(' + pt(rad, ang).replace(' ', ' ') + ')'; }
  var h = '<ellipse cx="100" cy="184" rx="52" ry="8" fill="#000" opacity=".16"/>';
  h += '<defs><clipPath id="' + id + '"><path d="' + wedge(134, A - .05) + '"/></clipPath></defs>';
  h += '<g class="pa-sway">';
  h += '<path d="' + wedge(156, A) + '" fill="#d9954a" stroke="#b8732f" stroke-width="2" stroke-linejoin="round"/>';
  h += '<path d="M' + pt(156, -A) + 'A156 156 0 0 1 ' + pt(156, A) + '" fill="none" stroke="#b8732f" stroke-width="3" stroke-dasharray="3 9" opacity=".6"/>';
  h += '<path d="' + wedge(136, A - .05) + '" fill="' + sauce + '"/>';
  h += '<g clip-path="url(#' + id + ')">';
  for (var i = 0; i < 6; i++) {
    var ra = 40 + r() * 86, an = (r() - .5) * .62;
    h += '<g class="pa-bub" style="animation-delay:' + (r() * 2.4).toFixed(2) + 's"><circle cx="' + pt(ra, an).split(' ')[0] + '" cy="' + pt(ra, an).split(' ')[1] + '" r="' + (9 + r() * 5).toFixed(1) + '" fill="' + (o.white ? '#fffaf0' : '#fbf1d8') + '"/></g>';
  }
  var spots = [[56, -.12], [80, .14], [102, -.2], [118, .1], [92, -.02], [124, -.08]];
  spots.forEach(function (q, k) {
    var tr = at(q[0], q[1]);
    if (o.top === 'salame') h += '<g transform="' + tr + '"><circle r="9" fill="#a8261c"/><circle cx="2" cy="-2" r="1.6" fill="#f4c7b8"/></g>';
    else if (o.top === 'funghi') h += '<path transform="' + tr + '" d="M-7 0a7 6 0 0 1 14 0zM-2 0h4v6h-4z" fill="#8a5a3b"/>';
    else if (o.top === 'verdure') h += '<rect transform="' + tr + ' rotate(' + (k * 37) + ')" x="-8" y="-2" width="16" height="4" rx="2" fill="' + ['#f2b705', '#3f9a3a', '#e5392b'][k % 3] + '"/>';
    else if (o.top === 'olive') { if (k < 5) h += '<g transform="' + tr + '"><circle r="5" fill="#2a2a2a"/><circle r="2" fill="#c0392b"/></g>'; }
    else if (o.top === 'crudo') { if (k < 4) h += '<path transform="' + tr + ' rotate(' + k * 60 + ')" d="M-12 -4q12-10 24 0q-12 12-24 0z" fill="#e6918a"/>'; }
  });
  if (o.basil !== false) [[70, .1], [110, -.12], [126, .16]].forEach(function (q, k) { h += '<path transform="' + at(q[0], q[1]) + ' rotate(' + (k * 80 - 30) + ')" d="M0 0c6-8 16-8 20 0-6 6-14 6-20 0z" fill="#2f8a2f"/>'; });
  h += '</g>';
  h += '<path class="pa-stretch" d="M100 172q-3 6 0 12" stroke="' + (o.white ? '#fffaf0' : '#fbf1d8') + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
  h += '</g>';
  h += steam([82, 118], 30);
  return h;
};

D.fritti = function (o) {
  var h = plate(138, {rim: '#f6efe2', in2: '#efe5d2'});
  var pos = [[72, 118], [104, 112], [134, 122]];
  pos.forEach(function (p, k) {
    h += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + (o.round ? 18 : 22) + '" ry="' + (o.round ? 18 : 14) + '" fill="#d18a32"/>';
    var r = rng(k + 4);
    for (var i = 0; i < 12; i++) h += '<circle cx="' + (p[0] - 14 + r() * 28).toFixed(1) + '" cy="' + (p[1] - 10 + r() * 20).toFixed(1) + '" r="1.4" fill="#f2c26a"/>';
  });
  h += '<path class="pa-stretch" d="M104 118q-2 18 4 30" stroke="#fff6dc" stroke-width="5" fill="none" stroke-linecap="round"/>';
  h += '<path d="M96 116a10 6 0 0 0 18 0" fill="' + (o.in || '#c2412c') + '"/>';
  h += steam([72, 104, 134], 94);
  return h;
};

D.piadina = function (o) {
  var f = o.f || ['#e6918a', '#fbf3df', '#4fb043'], h = '<ellipse cx="100" cy="160" rx="80" ry="14" fill="#000" opacity=".14"/>';
  h += '<rect x="18" y="138" width="164" height="22" rx="8" fill="#a9733f"/><rect x="18" y="138" width="164" height="5" rx="2" fill="#c48a52"/>';
  h += '<g class="pa-bounce">';
  h += '<path d="M28 132a72 72 0 0 1 144 0z" fill="#f1d79c"/><path d="M28 132a72 72 0 0 1 144 0" fill="none" stroke="#d9b06a" stroke-width="3"/>';
  f.forEach(function (c, k) { h += '<path d="M' + (38 + k * 5) + ' ' + (128 + k * 3) + 'q8-9 16 0t16 0t16 0t16 0t16 0t16 0t16 0" stroke="' + c + '" stroke-width="7" fill="none" stroke-linecap="round"/>'; });
  h += '<path d="M30 136h140" stroke="#e2c07c" stroke-width="5" stroke-linecap="round"/>';
  var r = rng(o.seed || 21);
  for (var i = 0; i < 16; i++) { var a = 3.3 + r() * 2.9, d = 20 + r() * 46; h += '<ellipse cx="' + (100 + Math.cos(a) * d).toFixed(1) + '" cy="' + (136 + Math.sin(a) * d * .95).toFixed(1) + '" rx="' + (2 + r() * 3).toFixed(1) + '" ry="' + (1.5 + r() * 2).toFixed(1) + '" fill="#b77a35" opacity=".7"/>'; }
  h += '</g>';
  h += steam([70, 100, 130], 58);
  return h;
};

D.crescione = function (o) {
  var h = '<ellipse cx="100" cy="160" rx="80" ry="14" fill="#000" opacity=".14"/><rect x="18" y="138" width="164" height="22" rx="8" fill="#a9733f"/>';
  h += '<path d="M30 136a70 52 0 0 1 140 0z" fill="#f0d18f"/>';
  for (var i = 0; i < 14; i++) h += '<circle cx="' + (36 + i * 9.4) + '" cy="135" r="2.6" fill="#d4a25c"/>';
  for (var k = 0; k < 4; k++) h += '<path d="M' + (60 + k * 24) + ' 98l-14 30" stroke="#8c5a2a" stroke-width="4" stroke-linecap="round" opacity=".55"/>';
  h += '<path class="pa-drip" d="M162 128q8 2 8 12 0 6-6 6t-5-8z" fill="' + (o.c || '#fbf3df') + '"/>';
  h += '<path class="pa-drip" style="animation-delay:1.2s" d="M40 130q-8 2-8 10 0 6 6 6t4-8z" fill="' + (o.c2 || '#c2412c') + '"/>';
  h += steam([76, 100, 124], 76);
  return h;
};

D.rotolo = function (o) {
  var h = '<ellipse cx="100" cy="160" rx="80" ry="14" fill="#000" opacity=".14"/><rect x="18" y="138" width="164" height="22" rx="8" fill="#a9733f"/>';
  [[62, 112], [120, 116]].forEach(function (p, k) {
    h += '<g class="pa-bob" style="animation-delay:' + k * .5 + 's"><rect x="' + (p[0] - 24) + '" y="' + (p[1] - 22) + '" width="54" height="44" rx="22" fill="#e9c47f"/>';
    h += '<circle cx="' + (p[0] + 6) + '" cy="' + p[1] + '" r="22" fill="#f1d79c"/>';
    h += '<path class="pa-spin-f" d="M' + (p[0] + 6) + ' ' + p[1] + 'm-3 0a3 3 0 1 1 6 0a7 7 0 1 1-12 0a11 11 0 1 1 20 0a15 15 0 1 1-28 0" fill="none" stroke="' + (o.c || '#e6918a') + '" stroke-width="4"/></g>';
  });
  h += steam([70, 128], 80);
  return h;
};

D.caffe = function (o) {
  var h = '<ellipse cx="100" cy="150" rx="70" ry="18" fill="#000" opacity=".12"/><ellipse cx="100" cy="146" rx="70" ry="18" fill="#f4f1ec"/><ellipse cx="100" cy="144" rx="44" ry="10" fill="#e3ddd2"/>';
  h += '<path d="M150 104q22 0 20 16t-24 14" fill="none" stroke="#f4f1ec" stroke-width="9"/>';
  h += '<path d="M54 92h92q-2 50-46 52-44-2-46-52z" fill="#fbfaf7"/><path d="M60 100q4 34 30 40" stroke="#000" stroke-opacity=".05" stroke-width="8" fill="none"/>';
  h += '<ellipse cx="100" cy="92" rx="46" ry="13" fill="#e9e4dc"/><ellipse cx="100" cy="93" rx="41" ry="10" fill="' + (o.c || '#6b3b1f') + '"/>';
  h += '<g class="pa-spin-f"><path d="M100 93m-26 0a26 6 0 1 0 52 0a18 4 0 1 0-36 0a10 2.4 0 1 0 20 0" fill="none" stroke="#c98f55" stroke-width="2.6" opacity=".9"/></g>';
  h += '<path d="M132 138l40-10" stroke="#c9c2b6" stroke-width="5" stroke-linecap="round"/>';
  h += steam([86, 106], 78);
  return h;
};

D.cappuccino = function () {
  var h = '<ellipse cx="100" cy="156" rx="78" ry="18" fill="#000" opacity=".12"/><ellipse cx="100" cy="152" rx="78" ry="18" fill="#f4f1ec"/>';
  h += '<path d="M154 96q26 0 24 20t-28 18" fill="none" stroke="#f0ece5" stroke-width="10"/>';
  h += '<path d="M42 84h116q-2 62-58 64-56-2-58-64z" fill="#fbfaf7"/>';
  h += '<ellipse cx="100" cy="84" rx="58" ry="16" fill="#ece7df"/><ellipse cx="100" cy="85" rx="52" ry="13" fill="#b9814f"/>';
  h += '<g class="pa-swirl"><ellipse cx="100" cy="85" rx="38" ry="9" fill="#fbf4e8"/><path d="M100 92c-14-6-14-14-6-14 3 0 5 2 6 4 1-2 3-4 6-4 8 0 8 8-6 14z" fill="#b9814f"/></g>';
  var r = rng(2); for (var i = 0; i < 8; i++) h += '<circle cx="' + (64 + r() * 72).toFixed(1) + '" cy="' + (80 + r() * 10).toFixed(1) + '" r="1.1" fill="#6b3b1f"/>';
  h += steam([84, 104, 122], 66);
  return h;
};

D.cornetto = function (o) {
  var c = o.c || '#e3a24c', d = o.c2 || '#b9702a', h = '<ellipse cx="100" cy="146" rx="76" ry="13" fill="#000" opacity=".14"/>';
  var seg = [[40, 120, 13, 18, -62], [160, 120, 13, 18, 62], [64, 102, 21, 28, -38], [136, 102, 21, 28, 38], [100, 92, 28, 36, 0]];
  h += '<defs><radialGradient id="cg' + o.id + '" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#f7cf83"/><stop offset=".6" stop-color="' + c + '"/><stop offset="1" stop-color="' + d + '"/></radialGradient>';
  h += '<clipPath id="cl' + o.id + '">' + seg.map(function (e) { return '<ellipse cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '" transform="rotate(' + e[4] + ' ' + e[0] + ' ' + e[1] + ')"/>'; }).join('') + '</clipPath></defs>';
  seg.forEach(function (e) { h += '<ellipse cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '" transform="rotate(' + e[4] + ' ' + e[0] + ' ' + e[1] + ')" fill="url(#cg' + o.id + ')" stroke="' + d + '" stroke-width="2.2"/>'; });
  h += '<g clip-path="url(#cl' + o.id + ')"><rect class="pa-shine" x="30" y="40" width="24" height="120" fill="#fff" opacity=".4" transform="skewX(-20)"/></g>';
  if (o.fill) h += '<path class="pa-drip" d="M100 118q7 0 7 10 0 8-7 8t-7-8q0-10 7-10z" fill="' + o.fill + '"/>';
  if (o.sugar !== false) { var r = rng(4); for (var i = 0; i < 12; i++) h += '<circle class="pa-fall" style="animation-delay:' + (r() * 2.8).toFixed(2) + 's" cx="' + (46 + r() * 108).toFixed(0) + '" cy="58" r="1.7" fill="#fff"/>'; }
  return h;
};

D.torta = function (o) {
  var c = o.c || '#ff6b8a', h = '<ellipse cx="100" cy="160" rx="72" ry="14" fill="#000" opacity=".14"/><ellipse cx="100" cy="154" rx="72" ry="16" fill="#f4f1ec"/>';
  h += '<path d="M40 100l60-24 60 24v44l-60 14-60-14z" fill="#f6e2b8"/>';
  var ly = [['#f8e7c4', 0], [c, 12], ['#fff8ee', 18], ['#f8e7c4', 26], [c, 38]];
  ly.forEach(function (l) { h += '<path d="M40 ' + (104 + l[1]) + 'l60 14 60-14v5l-60 14-60-14z" fill="' + l[0] + '"/>'; });
  h += '<path d="M40 100l60-24 60 24-60 14z" fill="#fff8ee"/>';
  for (var i = 0; i < 6; i++) h += '<path class="pa-drip" style="animation-delay:' + i * .4 + 's" d="M' + (48 + i * 20) + ' ' + (102 + (i < 3 ? i * 4 : (5 - i) * 4) + 6) + 'q4 0 4 8t-4 6-4-6 4-8z" fill="' + c + '"/>';
  h += '<g class="pa-bob"><circle cx="100" cy="80" r="11" fill="#d9183b"/><circle cx="96" cy="76" r="3" fill="#fff" opacity=".6"/><path d="M100 70q4-14 14-18" stroke="#3f7a2a" stroke-width="2.5" fill="none"/></g>';
  return h;
};

D.cannolo = function () {
  var h = '<ellipse cx="100" cy="150" rx="78" ry="14" fill="#000" opacity=".14"/>';
  h += '<g transform="rotate(-14 100 110)"><rect x="40" y="88" width="120" height="44" rx="22" fill="#c98a3c"/>';
  for (var i = 0; i < 6; i++) h += '<circle cx="' + (58 + i * 17) + '" cy="' + (100 + (i % 2) * 18) + '" r="4" fill="#a86a28" opacity=".6"/>';
  h += '<ellipse cx="40" cy="110" rx="14" ry="22" fill="#fbf6ea"/><ellipse cx="160" cy="110" rx="14" ry="22" fill="#fbf6ea"/>';
  h += '<g class="pa-bob"><rect x="30" y="100" width="6" height="6" rx="1" fill="#5aa13b"/><rect x="164" y="112" width="6" height="6" rx="1" fill="#5aa13b"/><circle cx="34" cy="118" r="3" fill="#e5392b"/><circle cx="166" cy="100" r="3" fill="#f39c12"/></g></g>';
  var r = rng(8); for (var k = 0; k < 14; k++) h += '<circle class="pa-fall" style="animation-delay:' + (r() * 2.8).toFixed(2) + 's" cx="' + (40 + r() * 120).toFixed(0) + '" cy="70" r="1.8" fill="#fff"/>';
  return h;
};

D.macaron = function () {
  var cs = [['#ff9db5', '#fff'], ['#9fe0c4', '#fff6dc'], ['#ffd27a', '#fff'], ['#c7a6ff', '#fff6dc']], h = '<ellipse cx="100" cy="166" rx="56" ry="10" fill="#000" opacity=".14"/>';
  cs.forEach(function (c, k) {
    var y = 146 - k * 28;
    h += '<g class="pa-bob" style="animation-delay:' + k * .18 + 's"><ellipse cx="100" cy="' + y + '" rx="44" ry="13" fill="' + c[0] + '"/><rect x="58" y="' + (y - 9) + '" width="84" height="7" rx="3" fill="' + c[1] + '"/><ellipse cx="100" cy="' + (y - 13) + '" rx="44" ry="13" fill="' + c[0] + '"/><ellipse cx="92" cy="' + (y - 17) + '" rx="16" ry="4" fill="#fff" opacity=".35"/></g>';
  });
  return h;
};

D.spremuta = function (o) {
  var c = o.c || '#ffa62b', h = '<ellipse cx="100" cy="170" rx="40" ry="8" fill="#000" opacity=".14"/>';
  h += '<defs><clipPath id="gl' + o.id + '"><path d="M64 60h72l-8 104h-56z"/></clipPath></defs>';
  h += '<g clip-path="url(#gl' + o.id + ')"><rect x="60" y="78" width="80" height="90" fill="' + c + '"/><rect x="60" y="78" width="80" height="6" fill="#fff" opacity=".35"/>' + bubbles(70, 130, 160, 10, 'rgba(255,255,255,.7)', o.seed) + '</g>';
  h += '<path d="M64 60h72l-8 104h-56z" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".7" stroke-width="2.5"/>';
  h += '<path d="M118 30l-6 100" stroke="' + (o.straw || '#ff3c6a') + '" stroke-width="6" stroke-linecap="round"/>';
  h += '<g class="pa-wob"><circle cx="136" cy="62" r="18" fill="' + (o.slice || '#ff9f1a') + '"/><circle cx="136" cy="62" r="14" fill="' + (o.slice2 || '#ffd27a') + '"/><path d="M136 48v28M122 62h28M126 52l20 20M146 52l-20 20" stroke="' + (o.slice || '#ff9f1a') + '" stroke-width="1.5"/></g>';
  return h;
};

D.birra = function (o) {
  var c = o.c || '#f2a516', h = '<ellipse cx="100" cy="174" rx="44" ry="9" fill="#000" opacity=".16"/>';
  h += '<defs><clipPath id="bg' + o.id + '"><path d="M58 56h84l-8 116h-68z"/></clipPath><linearGradient id="bl' + o.id + '" x1="0" x2="1"><stop offset="0" stop-color="' + c + '"/><stop offset=".5" stop-color="' + (o.c2 || '#ffcf4a') + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>';
  h += '<g clip-path="url(#bg' + o.id + ')"><rect x="50" y="66" width="100" height="110" fill="url(#bl' + o.id + ')"/>' + bubbles(66, 134, 168, 14, 'rgba(255,255,255,.75)', o.seed) + '</g>';
  h += '<path d="M58 56h84l-8 116h-68z" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"/>';
  h += '<g class="pa-jelly"><path d="M54 66q-6-22 14-22 4-14 22-10 10-12 26-2 18-6 22 10 16 4 8 24z" fill="' + (o.foam || '#fffaf0') + '"/></g>';
  h += '<path class="pa-drip" d="M62 70q3 0 3 10t-3 8-3-8 3-10z" fill="' + (o.foam || '#fffaf0') + '"/>';
  h += '<path d="M70 90v60" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>';
  return h;
};

D.cocktail = function (o) {
  var c = o.c || '#ff5c8a', h = '<ellipse cx="100" cy="176" rx="36" ry="7" fill="#000" opacity=".16"/>';
  h += '<path d="M100 120v52M76 174h48" stroke="#fff" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>';
  h += '<defs><clipPath id="ck' + o.id + '"><path d="M44 60h112q-6 56-56 62-50-6-56-62z"/></clipPath></defs>';
  h += '<g clip-path="url(#ck' + o.id + ')"><g class="pa-swirl"><rect x="30" y="72" width="140" height="60" fill="' + c + '"/><rect x="30" y="72" width="140" height="5" fill="#fff" opacity=".35"/></g>' + bubbles(60, 140, 120, 9, 'rgba(255,255,255,.7)', o.seed) + '</g>';
  h += '<path d="M44 60h112q-6 56-56 62-50-6-56-62z" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".7" stroke-width="2.5"/>';
  if (o.garnish === 'olive') h += '<g class="pa-wob"><path d="M78 40l40 50" stroke="#c9a46a" stroke-width="3"/><ellipse cx="104" cy="72" rx="9" ry="7" fill="#7fae4a"/><circle cx="106" cy="71" r="2.6" fill="#c0392b"/></g>';
  else h += '<g class="pa-spin-f"><circle cx="150" cy="60" r="16" fill="' + (o.g1 || '#f6d33c') + '"/><circle cx="150" cy="60" r="12" fill="' + (o.g2 || '#fbe98a') + '"/><path d="M150 48v24M138 60h24M142 52l16 16M158 52l-16 16" stroke="' + (o.g1 || '#f6d33c') + '" stroke-width="1.4"/></g>';
  h += sparkle(60, 52, 0) + sparkle(130, 100, .9);
  return h;
};

D.vino = function (o) {
  var c = o.c || '#8e1b3a', h = '<ellipse cx="100" cy="176" rx="34" ry="7" fill="#000" opacity=".16"/>';
  h += '<path d="M100 124v48M78 174h44" stroke="#fff" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>';
  h += '<defs><clipPath id="vn' + o.id + '"><path d="M64 36h72q8 60-36 88-44-28-36-88z"/></clipPath></defs>';
  h += '<g clip-path="url(#vn' + o.id + ')"><g class="pa-swirl"><path d="M40 84q60-14 120 0v60h-120z" fill="' + c + '"/><path d="M40 84q60-14 120 0" stroke="#fff" stroke-opacity=".3" stroke-width="3" fill="none"/></g></g>';
  h += '<path d="M64 36h72q8 60-36 88-44-28-36-88z" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".7" stroke-width="2.5"/>';
  h += '<path d="M76 50q-4 30 10 50" stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none" stroke-linecap="round"/>';
  h += sparkle(124, 56, .4);
  return h;
};

D.spritz = function (o) {
  var h = '<ellipse cx="100" cy="176" rx="36" ry="7" fill="#000" opacity=".16"/>';
  h += '<path d="M100 130v42M78 174h44" stroke="#fff" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>';
  h += '<defs><clipPath id="sp' + o.id + '"><path d="M58 40h84q6 70-42 92-48-22-42-92z"/></clipPath></defs>';
  h += '<g clip-path="url(#sp' + o.id + ')"><rect x="50" y="62" width="100" height="80" fill="' + (o.c || '#ff7a1a') + '"/>';
  h += '<g class="pa-bob"><rect x="70" y="66" width="22" height="20" rx="4" fill="#fff" fill-opacity=".45" transform="rotate(12 81 76)"/><rect x="100" y="72" width="20" height="18" rx="4" fill="#fff" fill-opacity=".4" transform="rotate(-10 110 81)"/></g>';
  h += bubbles(66, 134, 132, 12, 'rgba(255,255,255,.75)', o.seed) + '</g>';
  h += '<path d="M58 40h84q6 70-42 92-48-22-42-92z" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-opacity=".7" stroke-width="2.5"/>';
  h += '<g class="pa-wob"><circle cx="70" cy="96" r="18" fill="#ff9f1a"/><circle cx="70" cy="96" r="14" fill="#ffc768"/><path d="M70 82v28M56 96h28" stroke="#ff9f1a" stroke-width="1.5"/></g>';
  h += '<path d="M126 24l-12 90" stroke="#fff" stroke-width="5" stroke-linecap="round"/>';
  return h;
};

D.burger = function () {
  var h = '<ellipse cx="100" cy="168" rx="70" ry="12" fill="#000" opacity=".16"/><g class="pa-bounce">';
  h += '<path d="M38 150q0 14 62 14t62-14v-10h-124z" fill="#d68a3c"/>';
  h += '<rect x="34" y="122" width="132" height="20" rx="10" fill="#5a2e1c"/>';
  h += '<path d="M36 120h128l-20 14-10-6-14 12-12-12-16 16-10-14-14 10-12-8z" fill="#ffc22e"/>';
  h += '<path class="pa-drip" d="M70 126q5 0 5 10 0 6-5 6t-5-6q0-10 5-10z" fill="#ffc22e"/>';
  h += '<path d="M32 116q10-10 20 0t20 0 20 0 20 0 20 0 20 0 20 0" stroke="#59b33b" stroke-width="10" fill="none" stroke-linecap="round"/>';
  h += '<rect x="44" y="104" width="112" height="8" rx="4" fill="#e5392b"/>';
  h += '<path d="M36 104q0-58 64-58t64 58z" fill="#e39a45"/><path d="M50 88q20-34 60-34" stroke="#fff" stroke-opacity=".25" stroke-width="7" fill="none" stroke-linecap="round"/>';
  var r = rng(6); for (var i = 0; i < 12; i++) { var sx = (58 + r() * 84).toFixed(0), sy = (60 + r() * 34).toFixed(0); h += '<ellipse cx="' + sx + '" cy="' + sy + '" rx="2.6" ry="1.4" fill="#fff6dc" transform="rotate(' + (r() * 90).toFixed(0) + ' ' + sx + ' ' + sy + ')"/>'; }
  h += '</g>' + steam([76, 124], 46);
  return h;
};

D.patatine = function () {
  var h = '<ellipse cx="100" cy="172" rx="50" ry="9" fill="#000" opacity=".16"/>';
  for (var i = 0; i < 9; i++) h += '<rect class="pa-wig" style="animation-delay:' + (i * .13).toFixed(2) + 's" x="' + (62 + i * 9) + '" y="' + (44 + (i % 3) * 10) + '" width="9" height="80" rx="3" fill="' + (i % 2 ? '#ffd24a' : '#f7c32e') + '" transform="rotate(' + ((i - 4) * 4) + ' ' + (66 + i * 9) + ' 120)"/>';
  h += '<path d="M56 96h88l-12 76h-64z" fill="#e5392b"/><path d="M56 96q44 22 88 0" fill="#c22a20"/>';
  h += '<path d="M86 132a14 14 0 1 0 28 0a14 14 0 1 0-28 0" fill="#fff" fill-opacity=".9"/><text x="100" y="137" text-anchor="middle" font-size="13" font-weight="800" fill="#e5392b" font-family="system-ui">★</text>';
  h += sparkle(70, 44, 0) + sparkle(128, 52, .7) + sparkle(100, 34, 1.3);
  return h;
};

D.alette = function () {
  var h = plate(134, {rim: '#2b2622', in: '#1f1b18', in2: '#26211d'});
  [[70, 118, -20], [100, 110, 10], [130, 120, 30], [96, 128, -5]].forEach(function (p, k) {
    h += '<g class="pa-bob" style="animation-delay:' + k * .3 + 's" transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')"><ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="18" ry="11" fill="#a8401c"/><ellipse cx="' + (p[0] - 4) + '" cy="' + (p[1] - 3) + '" rx="8" ry="3" fill="#e0773a" opacity=".7"/><rect x="' + (p[0] + 14) + '" y="' + (p[1] - 3) + '" width="12" height="6" rx="3" fill="#f3e3c6"/></g>';
  });
  h += '<circle cx="146" cy="104" r="9" fill="#f4f1ec"/><circle cx="146" cy="104" r="6" fill="#e6efd8"/>';
  h += '<path class="pa-smoke" d="M80 92c-7-8 7-14 0-22s7-14 0-22"/><path class="pa-smoke" style="animation-delay:1.3s" d="M108 90c-7-8 7-14 0-22s7-14 0-22"/><path class="pa-smoke" style="animation-delay:2.6s" d="M130 94c-7-8 7-14 0-22s7-14 0-22"/>';
  h += '<g class="pa-sizzle">' + sparkle(64, 104, 0, '#ffb347') + sparkle(134, 112, .4, '#ffb347') + '</g>';
  return h;
};

D.tiramisu = function () {
  var h = '<ellipse cx="100" cy="164" rx="70" ry="12" fill="#000" opacity=".14"/>';
  h += '<path d="M46 76h108l-6 86h-96z" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".6" stroke-width="2.5"/>';
  var ly = [['#6b3b1f', 142], ['#fbf1dc', 128], ['#8a5230', 114], ['#fbf1dc', 100], ['#5a2e14', 92]];
  ly.forEach(function (l) { h += '<rect x="' + (52 + (162 - l[1]) * .04) + '" y="' + l[1] + '" width="' + (96 - (162 - l[1]) * .08) + '" height="' + (l[1] === 92 ? 8 : 14) + '" fill="' + l[0] + '"/>'; });
  var r = rng(12); for (var i = 0; i < 16; i++) h += '<circle class="pa-fall" style="animation-delay:' + (r() * 2.8).toFixed(2) + 's" cx="' + (56 + r() * 88).toFixed(0) + '" cy="60" r="1.5" fill="#4a2410"/>';
  h += '<g class="pa-bob"><circle cx="122" cy="86" r="7" fill="#3b1d0c"/><path d="M118 84q4 4 8 0" stroke="#7a4a28" stroke-width="1.4" fill="none"/></g>';
  return h;
};

D.pannacotta = function (o) {
  var h = '<ellipse cx="100" cy="160" rx="70" ry="14" fill="#000" opacity=".14"/><ellipse cx="100" cy="154" rx="70" ry="16" fill="#f4f1ec"/>';
  h += '<g class="pa-jelly"><path d="M58 150q-4-60 42-64 46 4 42 64z" fill="#fff6e6"/><path d="M66 140q0-40 20-48" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>';
  h += '<path d="M64 98q36-22 72 0-6 10-12 4-6 14-14 4-8 12-14 2-8 10-14 0-8 8-12-2z" fill="' + (o.c || '#c8102e') + '"/></g>';
  h += '<path class="pa-drip" d="M76 104q4 0 4 12t-4 8-4-8 4-12z" fill="' + (o.c || '#c8102e') + '"/>';
  h += '<g class="pa-bob"><circle cx="100" cy="82" r="6" fill="' + (o.c || '#c8102e') + '"/><path d="M100 76q2-8 8-10" stroke="#3f7a2a" stroke-width="2" fill="none"/></g>';
  return h;
};

D.tagliere = function () {
  var h = '<ellipse cx="100" cy="160" rx="84" ry="14" fill="#000" opacity=".14"/>';
  h += '<rect x="20" y="104" width="160" height="50" rx="20" fill="#a9733f"/><rect x="20" y="104" width="160" height="10" rx="5" fill="#c48a52"/><circle cx="168" cy="128" r="5" fill="#7c5128"/>';
  for (var i = 0; i < 4; i++) h += '<g class="pa-bob" style="animation-delay:' + i * .25 + 's"><path d="M' + (34 + i * 16) + ' 110q8-18 20 0q-8 12-20 0z" fill="#e6918a"/></g>';
  h += '<g class="pa-bob" style="animation-delay:.4s"><path d="M104 120l26-22 18 24z" fill="#f6d77a"/><circle cx="118" cy="114" r="2.6" fill="#e2b350"/><circle cx="128" cy="118" r="2" fill="#e2b350"/></g>';
  h += '<g class="pa-bob" style="animation-delay:.8s"><circle cx="156" cy="112" r="7" fill="#7a2348"/><circle cx="150" cy="104" r="7" fill="#8e2a55"/><circle cx="162" cy="104" r="7" fill="#7a2348"/></g>';
  h += '<circle cx="92" cy="128" r="6" fill="#2a2a2a"/><circle cx="80" cy="132" r="6" fill="#4f7a3a"/>';
  return h;
};

D.emoji = function (o) {
  var h = plate(132);
  h += '<g class="pa-bob"><text x="100" y="128" text-anchor="middle" font-size="72" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">' + (o.e || '🍽️') + '</text></g>';
  if (o.steam !== false) h += steam([82, 118], 70);
  return h;
};

/* ---------- Disegno indovinato dal nome del piatto ---------- */
var GUESS = [
  [/tiramis|zuppa inglese/, 'tiramisu'],
  [/panna ?cotta|budino|cr[eè]me caramel|bavarese|mousse|gelat|sorbett|semifredd|affogato/, 'pannacotta'],
  [/cannol|sfogliatell|bomba|bombolon|krapfen/, 'cannolo'],
  [/macaron|pasticcin|biscott|cookie|amaretti/, 'macaron'],
  [/cornett|brioche|croissant|sfoglia(?!t)/, 'cornetto'],
  [/torta|crostata|cheesecake|millefoglie|sacher|strudel|cake|dolce del giorno/, 'torta'],
  [/cappuccin|caffe? ?latte|caffellatte|latte macchiato|marocchino/, 'cappuccino'],
  [/caff[eè]|espresso|ginseng|orzo|macchiato|americano(?! ?cocktail)|decaf/, 'caffe'],
  [/spritz|aperol|hugo/, 'spritz'],
  [/cocktail|negroni|mojito|\bgin\b|martini|margarita|daiquiri|mule|sour|tonic|drink|analcolic|moscow|bellini|old fashioned/, 'cocktail'],
  [/birr|beer|\bipa\b|lager|stout|weiss|pils|\bale\b|porter|alla spina|bionda|ambrata/, 'birra'],
  [/\bvin[oi]\b|calice|prosecco|champagne|franciacorta|bollicin|sangiovese|chianti|barolo|lambrusco|albana|aglianico|primitivo|montepulciano|vermentino|pinot|chardonnay|cabernet|merlot/, 'vino'],
  [/spremut|succo|centrifug|smoothie|frullat|aranciata|limonata|estratto|acqua|coca|bibit|t[eè] freddo|soft drink/, 'spremuta'],
  [/piadin|piada/, 'piadina'],
  [/crescion|cassone|calzone/, 'crescione'],
  [/rotol|girell|wrap|kebab|d[uü]r[uü]m|falafel/, 'rotolo'],
  [/burger|hamburger|panin|sandwich|toast|club/, 'burger'],
  [/patatin|chips|fries|patate fritte/, 'patatine'],
  [/suppl|arancin|frittatin|crocchet|polpett|olive ascolane|in carrozza|panzerott|montanar|fritt|tempura|nugget|anell/, 'fritti'],
  [/pizza|margherita|diavola|capricciosa|marinara|quattro formaggi|4 formaggi|ortolana|boscaiola|napoli|focaccia/, 'pizza'],
  [/lasagn|parmigiana|cannellon|pasticcio/, 'lasagna'],
  [/risott|\briso\b|paella/, 'risotto'],
  [/zupp|minestr|vellutat|ribollita|crema di|brodo|pasta e fagioli|ramen|passatelli in brodo/, 'zuppa'],
  [/spaghett|linguin|tagliatell|tagliolin|fettuccin|pappardell|penne|rigaton|paccher|bucatin|orecchiett|trofie|strozzapret|garganell|pasta|ravioli|tortell|cappellett|agnolott|gnocch|carbonara|amatriciana|gricia|cacio e pepe|bolognese|pesto/, 'pasta'],
  [/tagliata|bistecc|fiorentina|filetto|manzo|steak|entrecote|controfiletto|arrost|brasat|ossobuc|cotolett|scaloppin|vitell|agnell|maial|carne/, 'tagliata'],
  [/costin|ribs|alett|wings|pollo|spiedin|salsicc|grigliat|arrosticin|brace|bbq|pulled/, 'alette'],
  [/pesce|branzin|orat|salmon|tonn|spigol|baccal|gamber|polp[oi]\b|calamar|seppi|sushi|sashimi|nigiri|uramaki|crudo di mare|tartare di|cozze|vongol|frutti di mare|scoglio|astice|scampi/, 'pesce'],
  [/tagliere|salumi|formaggi|affettat|antipasto|bruschett|crostin|prosciutto e|culatello|mortadell/, 'tagliere'],
  [/insalat|burrata|caprese|bowl|pok[eè]|verdur|contorn|grigliata di verdure|carpaccio/, 'insalata']
];
function guess(text) {
  var t = String(text || '').toLowerCase();
  for (var i = 0; i < GUESS.length; i++) if (GUESS[i][0].test(t)) return GUESS[i][1];
  return null;
}
/* Varianti del disegno in base agli ingredienti scritti nel nome */
function variant(key, t) {
  t = String(t || '').toLowerCase();
  var o = {};
  if (key === 'pizza') {
    if (/bianc|quattro formaggi|4 formaggi|focaccia|patate/.test(t)) { o.white = true; o.basil = false; }
    if (/diavola|salam|piccant|spianata|nduja/.test(t)) { o.top = 'salame'; o.basil = false; }
    else if (/fungh|porcin|boscaiola/.test(t)) { o.top = 'funghi'; o.basil = false; }
    else if (/ortolana|verdur|vegetarian/.test(t)) o.top = 'verdure';
    else if (/crudo|prosciutto|parma|bresaola|speck/.test(t)) { o.top = 'crudo'; o.basil = false; }
    else if (/capricciosa|olive|napoli|romana|acciugh/.test(t)) o.top = 'olive';
  }
  if (key === 'pasta') {
    if (/carbonara|gricia|cacio|panna|alfredo|burro/.test(t)) { o.white = true; o.extra = /carbonara|gricia|guancial|pancett/.test(t) ? 'pancetta' : ''; }
    else if (/pesto|basilico|zucchin|asparag|spinac/.test(t)) o.s = '#4f9a3a';
    else if (/cozz|vongol|scoglio|frutti di mare|mare/.test(t)) o.extra = 'cozze';
    else if (/rag[uù]|bolognese|cinghial|salsicc/.test(t)) { o.s = '#9c3a1f'; o.n = '#f0c862'; }
    if (/nero di seppia/.test(t)) { o.s = '#2a2a2a'; o.n = '#3a3a3a'; o.n2 = '#1f1f1f'; }
  }
  if (key === 'risotto' && /fungh|porcin/.test(t)) { o.c = '#e3cfa2'; o.top = 'funghi'; }
  if (key === 'risotto' && /zucca/.test(t)) o.c = '#f0a040';
  if (key === 'zuppa' && /fagiol|legum|ceci|lentic|ribollita/.test(t)) { o.c = '#8a5a2c'; o.top = 'fagioli'; }
  if (key === 'zuppa' && /zucca|carot/.test(t)) { o.c = '#e08a2c'; o.top = 'crostini'; }
  if (key === 'fritti' && /arancin|crocchet|polpett|olive/.test(t)) o.round = true;
  if (key === 'cornetto') {
    if (/cioccolat|nutella|nocciol|gianduia/.test(t)) o.fill = '#5a2e14';
    else if (/crema|pasticcera/.test(t)) o.fill = '#f6d66b';
    else if (/marmellat|confettur|albicocc|frutti di bosco|lampon/.test(t)) o.fill = '#d9183b';
    else if (/integral|vegan/.test(t)) o.c = '#c98a4a';
  }
  if (key === 'torta' && /cioccolat|sacher|cacao/.test(t)) o.c = '#5a2e14';
  if (key === 'torta' && /limon|lemon/.test(t)) o.c = '#f6d33c';
  if (key === 'torta' && /pistacch|menta/.test(t)) o.c = '#8fc46a';
  if (key === 'torta' && /visciol|amaren|ciliegi|frutti di bosco|mirtill/.test(t)) o.c = '#8e1b3a';
  if (key === 'pannacotta' && /caramel/.test(t)) o.c = '#c8782a';
  if (key === 'pannacotta' && /cioccolat/.test(t)) o.c = '#4a2410';
  if (key === 'birra') {
    if (/stout|porter|scura|nera|dark|bock/.test(t)) { o.c = '#2a0f05'; o.c2 = '#4a1f0c'; o.foam = '#e9d7b5'; }
    else if (/weiss|weizen|blanche|bianca|frumento/.test(t)) { o.c = '#f2c14e'; o.c2 = '#ffe08a'; }
    else if (/ipa|rossa|ambrat|red|amber|apa/.test(t)) { o.c = '#d9821a'; o.c2 = '#f0a83a'; }
  }
  if (key === 'vino' && /bianc|prosecco|champagne|franciacorta|bollicin|albana|vermentino|chardonnay|pinot grigio|moscato|passito/.test(t)) o.c = '#e8c35a';
  if (key === 'vino' && /ros[eé]|rosato/.test(t)) o.c = '#f08aa0';
  if (key === 'cocktail') {
    if (/negroni|campari|americano|boulevardier/.test(t)) { o.c = '#c8102e'; o.g1 = '#ff9f1a'; o.g2 = '#ffc768'; }
    else if (/mojito|menta|basil|matcha/.test(t)) { o.c = '#cdeeb0'; o.g1 = '#7fae4a'; o.g2 = '#b8e08a'; }
    else if (/gin|tonic|martini|vodka/.test(t)) { o.c = '#d6f0ff'; if (/martini/.test(t)) o.garnish = 'olive'; }
    else if (/mule|ginger/.test(t)) { o.c = '#e8d2a0'; o.g1 = '#7fae4a'; o.g2 = '#b8e08a'; }
    else if (/blu|curacao/.test(t)) o.c = '#3aa0ff';
  }
  if (key === 'spremuta') {
    if (/limon/.test(t)) { o.c = '#f6e27a'; o.slice = '#f6d33c'; o.slice2 = '#fbe98a'; }
    else if (/acqua|tonic/.test(t)) { o.c = '#d9f1ff'; o.slice = '#7fd3ff'; o.slice2 = '#cfefff'; }
    else if (/coca|cola|chinotto|t[eè]/.test(t)) { o.c = '#5a2410'; }
    else if (/fragol|frutti rossi|anguria|pomodoro/.test(t)) { o.c = '#e5394a'; o.slice = '#e5392b'; o.slice2 = '#ff8a8a'; }
    else if (/kiwi|mela verde|centrifug|green|detox|sedano/.test(t)) { o.c = '#9bd13a'; o.slice = '#5aa13b'; o.slice2 = '#c8ee8a'; }
  }
  if (key === 'piadina' || key === 'rotolo' || key === 'crescione') {
    var f = [];
    if (/crudo|prosciutto|mortadell|cotto|speck|bresaola/.test(t)) f.push('#e6918a');
    if (/salsicc|porchett|kebab|carne|pollo|hamburger/.test(t)) f.push('#8a4a2b');
    if (/squacquer|stracchin|mozzarell|formagg|fontina|ricotta|tzatziki/.test(t)) f.push('#fbf3df');
    if (/rucol|verdur|insalat|spinac|erbe|biet|zucchin|falafel/.test(t)) f.push('#4fb043');
    if (/pomodor|peperon/.test(t)) f.push('#e5392b');
    if (/nutella|cioccolat|nocciol/.test(t)) f.push('#5a2e14');
    if (/salmon/.test(t)) f.push('#ff8a5c');
    if (f.length) { if (key === 'piadina') o.f = f.slice(0, 3); else { o.c = f[0]; o.c2 = f[1] || f[0]; } }
  }
  return o;
}

/* Disegno da mostrare per un piatto: foto del locale, disegno scelto, indovinato o emoji */
var PHOTO_OK = /^https:\/\/[A-Za-z0-9.-]+\/storage\/v1\/object\/public\/menu-photos\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{6,40}\.(webp|jpg|jpeg|png)$/;
/* ---------- Immagini 3D (Microsoft Fluent Emoji 3D, licenza MIT) ----------
   Attive nei temi che impostano Piatti.style3d = true (prima di disegnare).
   File in assets/emoji3d/<codice>.webp accanto a questo script. */
var F3D = {};
'1f32d 1f32e 1f32f 1f330 1f331 1f336 1f33d 1f33f 1f344 1f344-200d-1f7eb 1f345 1f346 1f347 1f348 1f349 1f34a 1f34b 1f34b-200d-1f7e9 1f34c 1f34d 1f34e 1f34f 1f350 1f351 1f352 1f353 1f354 1f355 1f356 1f357 1f358 1f359 1f35a 1f35b 1f35c 1f35d 1f35e 1f35f 1f360 1f361 1f362 1f363 1f364 1f365 1f366 1f367 1f368 1f369 1f36a 1f36b 1f36c 1f36d 1f36e 1f36f 1f370 1f371 1f372 1f373 1f374 1f375 1f376 1f377 1f378 1f379 1f37a 1f37b 1f37c 1f37d 1f37e 1f37f 1f382 1f3fa 1f404 1f40c 1f414 1f416 1f419 1f41d 1f41f 1f420 1f423 1f4a7 1f525 1f52a 1f942 1f943 1f944 1f950 1f951 1f952 1f953 1f954 1f955 1f956 1f957 1f958 1f959 1f95a 1f95b 1f95c 1f95d 1f95e 1f95f 1f960 1f961 1f962 1f963 1f964 1f965 1f966 1f967 1f968 1f969 1f96a 1f96b 1f96c 1f96d 1f96e 1f96f 1f980 1f986 1f990 1f991 1f99e 1f9aa 1f9c0 1f9c1 1f9c2 1f9c3 1f9c4 1f9c5 1f9c6 1f9c7 1f9c8 1f9c9 1f9ca 1f9cb 1fad0 1fad1 1fad2 1fad3 1fad4 1fad5 1fad6 1fad7 1fad8 1fad9 1fada 1fadb 2615'.split(' ').forEach(function (k) { F3D[k] = 1; });
var F3D_BASE = (function () {
  try { var src = (document.currentScript && document.currentScript.src) || ''; if (src) return src.replace(/[^\/]*$/, '') + 'emoji3d/'; } catch (e) {}
  return '/assets/emoji3d/';
})();
/* Disegno → emoji 3D che lo rappresenta */
var KEY_EMOJI = {pasta: '🍝', risotto: '🍚', zuppa: '🍲', lasagna: '🍝', tagliata: '🥩', pesce: '🐟', insalata: '🥗', pizza: '🍕',
  fritti: '🍤', piadina: '🫓', crescione: '🥟', rotolo: '🌯', caffe: '☕', cappuccino: '☕', cornetto: '🥐', torta: '🍰',
  cannolo: '🧁', macaron: '🍪', spremuta: '🍊', birra: '🍺', cocktail: '🍸', vino: '🍷', spritz: '🍹', burger: '🍔',
  patatine: '🍟', alette: '🍗', tiramisu: '🍰', pannacotta: '🍮', tagliere: '🧀'};
function f3dCode(e) {
  var out = [];
  Array.from(String(e || '')).forEach(function (ch) { var c = ch.codePointAt(0); if (c !== 0xfe0f) out.push(c.toString(16)); });
  var k = out.join('-');
  return F3D[k] ? k : (out.length && F3D[out[0]] ? out[0] : null);
}
function img3d(e) {
  var k = f3dCode(e);
  return k ? '<img class="pa pa-3d" src="' + F3D_BASE + k + '.webp" alt="" loading="lazy" decoding="async">' : '';
}
function art3d(it, cat) {
  var text = [it.n, it.d].join(' '), key = it.art || guess(it.n) || guess(text) || (cat ? guess(cat.n || cat.title) : null);
  return img3d(it.e) || (key && img3d(KEY_EMOJI[key])) || (cat && img3d(cat.e)) || '';
}

function art(it, cat) {
  if (it.ph && PHOTO_OK.test(it.ph)) return '<img class="pa pa-photo" src="' + it.ph + '" alt="" loading="lazy" decoding="async">';
  if (window.Piatti && window.Piatti.style3d) { var a3 = art3d(it, cat); if (a3) return a3; }
  if (it.art) return svg(it.art, it.o);
  var text = [it.n, it.d].join(' '), key = guess(it.n) || guess(text) || (cat ? guess(cat.n || cat.title) : null);
  if (key) return svg(key, variant(key, text));
  return svg('emoji', {e: it.e || (cat && cat.e) || '🍽️'});
}
/* Disegno per una categoria: quello scelto, oppure quello del primo piatto */
function catArt(c) {
  if (window.Piatti && window.Piatti.style3d) {
    var c3 = img3d(c.e) || (guess(c.n) && img3d(KEY_EMOJI[guess(c.n)])) || ((c.items || [])[0] ? art3d(c.items[0], c) : '');
    if (c3) return c3;
  }
  if (c.ic) return svg(c.ic[0], c.ic[1]);
  var k = guess(c.n), first = (c.items || [])[0];
  if (k) return svg(k, variant(k, c.n));
  if (first) return art(first, c);
  return svg('emoji', {e: c.e || '🍽️', steam: false});
}
/* Prezzo: dal gestionale arriva un numero, nei modelli un testo già pronto */
function price(p) {
  if (typeof p === 'number') return p.toFixed(2).replace('.', ',').replace(',00', '') + ' €';
  return p == null ? '' : String(p);
}
/* Etichetta del piatto (consigliato, piccante, veg, novità…) */
function label(it) {
  if (it.lb) return it.lb;
  if (it.top) return 'Consigliato';
  if (it.hot) return 'Piccante';
  if (it.veg) return 'Veg';
  if (it.isNew) return 'Novità';
  return '';
}

/* ---------- Generatore SVG ---------- */
function svg(key, opts) {
  var o = {}; for (var k in (opts || {})) o[k] = opts[k];
  o.id = 'pa' + (++uid);
  var f = D[key] || D.pasta;
  return '<svg class="pa pa-' + key + '" viewBox="0 0 200 200" aria-hidden="true" focusable="false">' + f(o) + '</svg>';
}

/* ---------- Popup scheda piatto ---------- */
var dlg = null, list = [], idx = 0, sx = null;
function tags(it) {
  var t = (it.tags || []).slice();
  if (!t.length && label(it)) t.push(label(it));
  [[it.hot, '🌶 Piccante'], [it.veg, '🌱 Veg'], [it.isNew, '✨ Novità']].forEach(function (x) { if (x[0] && t.indexOf(x[1]) < 0 && t.indexOf(x[1].slice(3)) < 0) t.push(x[1]); });
  return t;
}
function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'pm';
  dlg.setAttribute('aria-labelledby', 'pm-t');
  dlg.innerHTML = '<div class="pm-art"><button class="pm-x" type="button" aria-label="Chiudi">×</button><button class="pm-nav pm-prev" type="button" aria-label="Piatto precedente">‹</button><button class="pm-nav pm-next" type="button" aria-label="Piatto successivo">›</button><div class="pm-pic"></div></div><div class="pm-body"></div>';
  document.body.appendChild(dlg);
  dlg.querySelector('.pm-x').addEventListener('click', close);
  dlg.querySelector('.pm-prev').addEventListener('click', function () { go(-1); });
  dlg.querySelector('.pm-next').addEventListener('click', function () { go(1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
  dlg.addEventListener('pointerdown', function (e) { sx = e.clientX; });
  dlg.addEventListener('pointerup', function (e) { if (sx === null) return; var d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1); });
}
function fill() {
  var it = list[idx];
  dlg.querySelector('.pm-pic').innerHTML = art(it, it.catObj);
  var al = (it.al || []).map(function (a) { var x = AL[a]; return x ? '<li><span aria-hidden="true">' + x[0] + '</span>' + x[1] + '</li>' : ''; }).join('');
  dlg.querySelector('.pm-body').innerHTML =
    (it.cat ? '<div class="pm-cat">' + it.cat + '</div>' : '') +
    '<div class="pm-head"><h2 id="pm-t">' + it.n + '</h2><span class="pm-price">' + price(it.p) + '</span></div>' +
    (it.d ? '<p class="pm-desc">' + it.d + '</p>' : '') +
    (tags(it).length ? '<div class="pm-tags">' + tags(it).map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div>' : '') +
    '<div class="pm-al"><h3>Allergeni</h3>' + (al ? '<ul>' + al + '</ul>' : '<p class="none">Nessuno dei 14 allergeni principali</p>') + '</div>' +
    '<p class="pm-note">Per intolleranze o allergie chiedi sempre conferma al personale.</p>';
  var many = list.length > 1;
  dlg.querySelector('.pm-prev').hidden = !many; dlg.querySelector('.pm-next').hidden = !many;
}
function go(d) {
  if (list.length < 2) return;
  idx = (idx + d + list.length) % list.length;
  dlg.classList.remove('pm-swap'); void dlg.offsetWidth; dlg.classList.add('pm-swap');
  fill();
}
function open(items, i, from) {
  if (!dlg) build();
  list = items; idx = i || 0; fill();
  dlg.classList.remove('pm-swap');
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  document.documentElement.style.overflow = 'hidden';
  /* Si apre "ingrandendosi" dalla card toccata */
  if (from && !reduced && dlg.animate) {
    var a = from.getBoundingClientRect(), b = dlg.getBoundingClientRect();
    var sx2 = a.width / b.width, sy2 = a.height / b.height;
    dlg.animate([
      {transform: 'translate(' + (a.left + a.width / 2 - (b.left + b.width / 2)) + 'px,' + (a.top + a.height / 2 - (b.top + b.height / 2)) + 'px) scale(' + sx2 + ',' + sy2 + ')', opacity: .4, borderRadius: '30px'},
      {transform: 'none', opacity: 1}
    ], {duration: 480, easing: 'cubic-bezier(.2,.9,.2,1)'});
  }
  setTimeout(function () { var x = dlg.querySelector('.pm-x'); if (x) x.focus({preventScroll: true}); }, 30);
}
function close() {
  if (!dlg) return;
  document.documentElement.style.overflow = '';
  if (dlg.animate && !reduced) {
    var an = dlg.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(20px) scale(.96)'}], {duration: 220, easing: 'ease-in'});
    an.onfinish = function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); };
  } else if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg && dlg.open) { e.preventDefault(); close(); } });

/* Etichette allergeni brevi per le card */
function alIcons(arr) { return (arr || []).map(function (a) { var x = AL[a]; return x ? '<span title="' + x[1] + '">' + x[0] + '</span>' : ''; }).join(''); }

window.Piatti = {svg: svg, art: art, catArt: catArt, guess: guess, price: price, label: label, modal: open, close: close, al: AL, alIcons: alIcons, keys: Object.keys(D)};
})();
