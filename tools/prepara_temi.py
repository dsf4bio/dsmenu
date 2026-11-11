#!/usr/bin/env python3
"""
Prepara i temi mdc-005 … mdc-021 per dsmenu.it partendo dai modelli
dimostrativi del sito dsfabio.com (cartella passata come argomento).

Per ogni modello:
  * toglie la barra "MODELLO DIMOSTRATIVO" e lo script di prova (trial.js);
  * sostituisce i dati di esempio con il segnaposto /*DSM:DATA*/
    (api/menu.js ci mette i dati veri del cliente);
  * mette segnaposto __DSM_…__ nell'intestazione (nome, frase, sottotitolo…);
    gli elementi con data-dsm-opt="CHIAVE" spariscono se il dato manca;
  * nasconde o adatta i riquadri con dati inventati (lavagna, pescato del
    giorno, combo, componi la tua, salse, orari finti…);
  * rende neutra la nota sugli allergeni.

Uso:  python3 tools/prepara_temi.py ../dsfabio
"""
import pathlib
import re
import shutil
import sys

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '../dsfabio').resolve()
DST = pathlib.Path(__file__).resolve().parent.parent

ALLERGEN_NOTE = 'Per informazioni su allergeni e intolleranze chiedi al personale. I piatti possono contenere tracce di altri allergeni.'
DATA_RE = re.compile(r'/\* ====== DATI DEL MENU[\s\S]*?/\* =+ \*/')


def sub(h, old, new, count=1, regex=False):
    """Sostituzione che DEVE riuscire: se il modello cambia, lo script si ferma."""
    if regex:
        h2, n = re.subn(old, new, h, count=count)
    else:
        n = h.count(old)
        h2 = h.replace(old, new, count if count else -1)
    if n == 0:
        raise SystemExit(f'non trovato: {old[:80]!r}')
    return h2


def common(h, hide_css=''):
    h = re.sub(r'<div class="demo(-bar)?">[^<]*</div>\n?', '', h)
    h = re.sub(r'<script[^>]*src="assets/trial\.js"[^>]*></script>\n?', '', h)
    # nota allergeni: prima nel testo della pagina, poi dentro gli script
    h = re.sub(r'(?<=>)Per informazioni su allergeni e intolleranze[^<]*(?=</p>)', ALLERGEN_NOTE, h)
    h = re.sub(r'Per informazioni su allergeni e intolleranze(?:[^<\'"\\]|\\.)*?(?=[<\'"])', ALLERGEN_NOTE, h)
    css = '\n/* dsmenu: riquadri con dati di esempio nascosti */\n' + hide_css + '\n' if hide_css else ''
    return sub(h, '</style>', css + '</style>')


def opt(tag_open, key, inner):
    """<p class="x">__DSM_KEY__</p> che sparisce se il dato manca"""
    return tag_open[:-1] + f' data-dsm-opt="{key}">' + inner


THEMES = {}


def theme(src, dst):
    def deco(fn):
        THEMES[dst] = (src, fn)
        return fn
    return deco


@theme('mdc-005.html', 'mdc-005')
def t005(h):
    h = sub(h, '<p class="est">Dal 1987 · cucina di casa</p>', opt('<p class="est">', 'KICKER', '__DSM_KICKER__</p>'))
    h = sub(h, '<h1>Osteria del Borgo</h1>', '<h1>__DSM_NAME__</h1>')
    h = sub(h, '<p>Ricette della nonna, vino buono e niente fretta</p>', opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'))
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(h, '.board-wrap{display:none!important}')


@theme('mdc-006.html', 'mdc-006')
def t006(h):
    h = sub(h, '<p class="kick">Ristorante di pesce · sul porto</p>', opt('<p class="kick">', 'KICKER', '__DSM_KICKER__</p>'))
    h = sub(h, '<h1>Onda Blu</h1>', '<h1>__DSM_NAME__</h1>')
    h = sub(h, '<p>Il pescato del giorno, dalla barca alla tavola</p>', opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'))
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(h, '.catch{display:none!important}')


@theme('mdc-007.html', 'mdc-007')
def t007(h):
    h = sub(h, '<span class="badge">Craft beer pub</span>', opt('<span class="badge">', 'KICKER', '__DSM_KICKER__</span>'))
    h = sub(h, '<h1>Hop House</h1>', '<h1>__DSM_NAME__</h1>')
    h = sub(h, '<p>12 spine artigianali · burger · musica dal vivo il venerdì</p>', opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'))
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    # le schede Birre / Cucina / Altro diventano le sezioni del menu del cliente
    h = sub(h, "var view = 'birre'", "var view = DSM_START")
    h = sub(h, re.compile(r'<div class="seg-in" role="tablist" id="seg">[\s\S]*?</div></nav>'),
            '<div class="seg-in" role="tablist" id="seg">__DSM_TABS__</div></nav>', regex=True)
    h = sub(h, "else out += dishes(view === 'cucina' ? CUCINA : ALTRO);", "else out += dishes(DSM_VIEWS[view] || []);")
    return common(h, '.seg-in{display:flex;overflow-x:auto;scrollbar-width:none}.seg-in::-webkit-scrollbar{display:none}.seg button{flex:1 0 auto;padding:12px 16px;white-space:nowrap}')


@theme('mdc-008.html', 'mdc-008')
def t008(h):
    h = sub(h, '<h1>Forno<span>Rosso</span></h1>', '<h1>__DSM_NAME_A__<span>__DSM_NAME_B__</span></h1>')
    h = sub(h, '<p>Ristorante e pizzeria · cottura a legna in 90 secondi</p>', opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'))
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    h = sub(h, re.compile(r"\n  if \(c\.id === 'bianche'\) html \+= [^\n]*"), '', regex=True)
    return common(h, '.temp{display:none!important}')


@theme('mdc-009.html', 'mdc-009')
def t009(h):
    h = sub(h, '<span class="kick">Cocktail bar · lounge</span>', opt('<span class="kick">', 'KICKER', '__DSM_KICKER__</span>'))
    h = sub(h, '<h1>Ice Lounge</h1>', '<h1>__DSM_NAME__</h1>')
    h = sub(h, '<p>Ghiaccio cristallino fatto in casa, distillati scelti e drink preparati al momento.</p>', opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'))
    h = sub(h, '<b id="drink-name">Glacier</b><small id="drink-desc">Gin, menta glaciale, lime</small>',
            '<b id="drink-name">__DSM_DRINK_N__</b><small id="drink-desc">__DSM_DRINK_D__</small>')
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    # "Nel bicchiere ora": i primi drink del menu del cliente
    h = sub(h, re.compile(r'var DRINKS = \[[\s\S]*?\n\];'), 'var DRINKS = DSM_DRINKS;', regex=True)
    h = sub(h, 'var CAT_DRINK = {signature:0, classici:5, aperitivi:1, zero:3};', 'var CAT_DRINK = {};')
    h = sub(h, 'setTimeout(auto, 2600);',
            "if (!DRINKS.length) now.style.display = 'none'; else { heroEl.style.setProperty('--liq', DRINKS[0].c); if (DRINKS.length > 1) setTimeout(auto, 2600); }")
    return common(h)


@theme('mdc-010.html', 'mdc-010')
def t010(h):
    h = sub(h, '<h1 class="logo">Smash Lab<small>BURGER · FRIES · SHAKES</small></h1>',
            '<h1 class="logo">__DSM_NAME__' + opt('<small>', 'KICKER', '__DSM_KICKER__</small>') + '</h1>')
    h = sub(h, re.compile(r'\n  <div class="combo"[\s\S]*?\n  </div>'), '', regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    h = sub(h, "'Il Classic Smash 🔥'", "'Il burger è servito 🔥'")
    h = sub(h, "'Il Classic Smash è pronto! 🔥'", "'Il burger è pronto! 🔥'")
    return common(h)


@theme('mdc-011.html', 'mdc-011')
def t011(h):
    h = sub(h, '<span class="est">BBQ · Burger · Smokehouse</span>', opt('<span class="est">', 'KICKER', '__DSM_KICKER__</span>'))
    h = sub(h, '<h1>Smoke<span>&amp; Steel</span></h1>', '<h1>__DSM_NAME_A__<span>__DSM_NAME_B__</span></h1>')
    h = sub(h, '<p>Affumicato 14 ore nel nostro smoker a legna di quercia</p>', opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'))
    h = sub(h, re.compile(r'\n  <aside class="pit">[\s\S]*?</aside>'), '', regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(h)


@theme('mdc-012.html', 'mdc-012')
def t012(h):
    h = sub(h, '<span class="kick">Piadineria romagnola</span>', opt('<span class="kick">', 'KICKER', '__DSM_KICKER__</span>'))
    h = sub(h, '<h1>Al Testo</h1>', '<h1>__DSM_NAME__</h1>')
    h = sub(h, re.compile(r'<p>Piadina tirata a mano[^<]*</p>'), opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'), regex=True)
    h = sub(h, re.compile(r'\n\s*<p class="since">[^<]*</p>'), '', regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(h, '.builder{display:none!important}')


@theme('mdc-013.html', 'mdc-013')
def t013(h):
    h = sub(h, '<h1 class="sign">Bosforo</h1>', '<h1 class="sign">__DSM_NAME__</h1>')
    h = sub(h, '<div class="sub-sign">Kebab · Dürüm · Falafel</div>', opt('<div class="sub-sign">', 'KICKER', '__DSM_KICKER__</div>'))
    h = sub(h, re.compile(r'<p>Carne marinata 24 ore[^<]*</p>'), opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'), regex=True)
    h = sub(h, '<span class="hours" id="hours"><i></i>Aperto fino alle 2:00</span>',
            opt('<span class="hours" id="hours">', 'HOURS', '<i></i>__DSM_HOURS__</span>'))
    h = sub(h, re.compile(r'\n  <section class="sauces"[\s\S]*?\n  </section>'), '', regex=True)
    h = sub(h, re.compile(r'\n/\* Aperto / chiuso[\s\S]*?\n(?=\}\)\(\);)'), '\n', regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(h, '.fmt-row{display:none!important}')


@theme('demo-fuoco-brace.html', 'mdc-014')
def t014(h):
    h = sub(h, '<p class="kicker">Pizzeria · Griglia · Forno a legna</p>', opt('<p class="kicker">', 'KICKER', '__DSM_KICKER__</p>'))
    h = sub(h, re.compile(r'<h1 class="title" aria-label="Fuoco e Brace">[\s\S]*?</h1>'),
            '<h1 class="title" aria-label="__DSM_NAME__">__DSM_TITLE_LINES__</h1>', regex=True)
    h = sub(h, '<span class="food">🍕</span>', '<span class="food">__DSM_HERO_EMOJI__</span>')
    h = sub(h, re.compile(r'/\* =+\n   1\) DATI DEL MENU[\s\S]*?/\* =+ \*/'), '/*DSM:DATA*/', regex=True)
    return common(h)


@theme('demo-sakura-neon.html', 'mdc-015')
def t015(h):
    h = sub(h, '<div class="logo" aria-hidden="true">桜</div>', '<div class="logo" aria-hidden="true">__DSM_MONO__</div>')
    h = sub(h, '<h1 class="grad-text">Sakura Neon</h1>', '<h1 class="grad-text">__DSM_NAME__</h1>')
    h = sub(h, re.compile(r'<div class="mq">[\s\S]*?</div>'), '<div class="mq"><span>__DSM_MARQUEE__</span><span>__DSM_MARQUEE__</span></div>', regex=True)
    # dati: categorie del cliente; testi dell'interfaccia restano (italiano/inglese)
    h = sub(h, re.compile(r'const CATS = \[[\s\S]*?\n\];'), '/*DSM:DATA*/', regex=True)
    h = sub(h, "it:{tag:'Sushi · Ramen · Cocktail bar'", 'it:{tag:DSM_TAG')
    h = sub(h, "en:{tag:'Sushi · Ramen · Cocktail bar'", 'en:{tag:DSM_TAG')
    # i piatti sono solo in italiano: niente pulsante della lingua
    return common(h, '#lang{display:none!important}')


# ---- temi animati con piatti illustrati (assets/piatti.js) ----
# I modelli di dsfabio.com hanno i dati nel blocco "DATI DEL MENU" (var M = [...]) e
# gli elementi con dati di esempio marcati con la classe dsm-fake.
FAKE = '.dsm-fake{display:none!important}'


def nofake(h):
    """Toglie gli elementi con dati di esempio (orari, indirizzi, slogan…); quelli creati dagli script restano nascosti dal CSS."""
    return re.sub(r'<(div|p) class="[^"]*\bdsm-fake\b[^"]*">[\s\S]*?</\1>\n?', '', h)


@theme('mdc-014.html', 'mdc-016')
def t016(h):
    h = sub(h, '<span class="kick">Cucina contemporanea · Milano</span>', opt('<span class="kick">', 'KICKER', '__DSM_KICKER__</span>'))
    h = sub(h, '<h1 class="serif">Au<i>ra</i></h1>', '<h1 class="serif">__DSM_NAME_A__<i>__DSM_NAME_B__</i></h1>')
    h = sub(h, re.compile(r'<p>Stagione, territorio e tecnica\.[^<]*</p>'), opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'), regex=True)
    h = sub(h, re.compile(r'(<textPath href="#circ" id="ring-t">)[^<]*(</textPath>)'), r'\1__DSM_RING__\2', regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(nofake(h), FAKE)


@theme('mdc-015.html', 'mdc-017')
def t017(h):
    h = sub(h, '<small>Trattoria · cucina di casa</small>', opt('<small>', 'KICKER', '__DSM_KICKER__</small>'))
    h = sub(h, '<h1>Il Focolare</h1>', '<h1>__DSM_NAME__</h1>')
    h = sub(h, '<p class="since dsm-fake">dal 1962 · brace accesa tutti i giorni</p>', opt('<p class="since">', 'TAGLINE', '__DSM_TAGLINE__</p>'))
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(nofake(h), FAKE)


@theme('mdc-016.html', 'mdc-018')
def t018(h):
    h = sub(h, '<small>Pizzeria napoletana · forno a legna</small>', opt('<small>', 'KICKER', '__DSM_KICKER__</small>'))
    h = sub(h, '<h1 class="bowl">Vesuvio</h1>', '<h1 class="bowl">__DSM_NAME__</h1>')
    h = sub(h, re.compile(r'<p>Impasto a 48 ore[^<]*</p>'), opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'), regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(nofake(h), FAKE)


@theme('mdc-017.html', 'mdc-019')
def t019(h):
    h = sub(h, '<small>Piadineria romagnola</small>', opt('<small>', 'KICKER', '__DSM_KICKER__</small>'))
    h = sub(h, '<h1>La Piadaia</h1>', '<h1>__DSM_NAME__</h1>')
    h = sub(h, re.compile(r'<p>Impasto a mano ogni mattina[^<]*</p>'), opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'), regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(nofake(h), FAKE)


@theme('mdc-018.html', 'mdc-020')
def t020(h):
    h = sub(h, '<small>Bar · pasticceria · dal 1987</small>', opt('<small>', 'KICKER', '__DSM_KICKER__</small>'))
    h = sub(h, '<h1 class="serif">Zucchero <em>Velo</em></h1>', '<h1 class="serif">__DSM_NAME_A__<em>__DSM_NAME_B__</em></h1>')
    h = sub(h, re.compile(r'<p>Lievitati, pasticceria fresca[^<]*</p>'), opt('<p>', 'TAGLINE', '__DSM_TAGLINE__</p>'), regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(nofake(h), FAKE)


@theme('mdc-019.html', 'mdc-021')
def t021(h):
    h = sub(h, '<small>Pub · craft beer · kitchen</small>', opt('<small>', 'KICKER', '__DSM_KICKER__</small>'))
    h = sub(h, re.compile(r'<h1>THE <span>C<span class="f">O</span>PPER</span>[\s\S]*?</h1>'), '<h1>__DSM_NAME_A__<span>__DSM_NAME_B__</span></h1>', regex=True)
    h = sub(h, DATA_RE, '/*DSM:DATA*/', regex=True)
    return common(nofake(h), FAKE + '\n.neon h1{text-transform:uppercase}')


def copy_assets(h):
    for ref in sorted(set(re.findall(r'assets/(?:fonts|vendor)/[^"\')\s]+', h))):
        src = SRC / ref
        dst = DST / ref
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        if ref.endswith('.css'):
            for font in re.findall(r'url\(([^)]+\.woff2)\)', src.read_text()):
                f = font.strip('\'"')
                shutil.copyfile(src.parent / f, dst.parent / f)
    # piatti illustrati e scheda del piatto dei temi animati
    if 'assets/piatti.js' in h:
        shutil.copyfile(SRC / 'assets/piatti.js', DST / 'assets/piatti.js')


for dst, (src, fn) in THEMES.items():
    h = (SRC / src).read_text()
    out = fn(h)
    assert '/*DSM:DATA*/' in out, dst
    assert 'trial.js' not in out and 'MODELLO DIMOSTRATIVO' not in out, dst
    copy_assets(out)
    (DST / 'themes' / f'{dst}.html').write_text(out)
    print('ok', dst, '←', src)
