"""Traduzioni della home di dsmenu.it (stesso sistema di dsfabio.com/tools/i18n.py).

Uso:
  python3 tools/i18n.py extract   -> scrive tools/i18n/segments.json (testi italiani da tradurre)
  python3 tools/i18n.py build     -> genera /en /es /pt /de /fr dalle pagine italiane
                                     usando tools/i18n/<lingua>.json

Ogni file <lingua>.json è un oggetto {"testo italiano": "traduzione"}.
Le pagine italiane restano la fonte: dopo averle modificate si rilancia extract,
si traducono i testi nuovi e si rilancia build.
"""
import html, json, os, re, sys, urllib.parse
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'tools', 'i18n')
PAGES = ['index']
# Pagine con testi anche negli script (messaggi, errori): si traducono le stringhe JS presenti nel dizionario
JS_PAGES = {'index'}
# Pagine solo in italiano (testo legale): le altre lingue rimandano qui (vercel.json)
IT_ONLY = set()
LANGS = {
    'it': ('it_IT', 'Italiano'), 'en': ('en_GB', 'English'), 'es': ('es_ES', 'Español'),
    'pt': ('pt_BR', 'Português'), 'de': ('de_DE', 'Deutsch'), 'fr': ('fr_FR', 'Français'),
}
SITE = 'https://dsmenu.it'
INLINE = {'a', 'strong', 'em', 'b', 'i', 'span', 'br', 'small', 'sup', 'sub', 'code', 'mark', 'abbr', 'u', 's', 'wbr', 'time',
          'svg', 'path', 'rect', 'circle', 'g', 'line', 'polyline', 'polygon', 'use', 'img', 'input'}
VOID = {'br', 'img', 'meta', 'link', 'input', 'hr', 'wbr', 'source', 'col', 'area', 'base', 'embed', 'param', 'track',
        'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'use'}
SKIP = {'script', 'style', 'svg', 'noscript', 'template'}
ATTRS = {'alt', 'aria-label', 'title', 'placeholder', 'data-wa'}
META = {'description', 'og:title', 'og:description', 'og:image:alt', 'og:site_name', 'twitter:title', 'twitter:description'}
LETTER = re.compile(r'[A-Za-zÀ-ÿ]{2,}')


class Segmenter(HTMLParser):
    """Trova i blocchi di testo: elementi che contengono solo testo e tag in linea."""

    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.lines = [0]
        for m in re.finditer('\n', src):
            self.lines.append(m.end())
        self.stack = []      # [tag, inner_start, pure, has_text, skip]
        self.blocks = []     # (start, end) del contenuto interno
        self.attrs = []      # (start, end) del valore di un attributo da tradurre

    def off(self):
        l, c = self.getpos()
        return self.lines[l - 1] + c

    def handle_starttag(self, tag, attrs):
        start = self.off()
        text = self.get_starttag_text()
        end = start + len(text)
        skipping = any(e[4] for e in self.stack) or tag in SKIP
        if not skipping:
            self._attrs(tag, attrs, start, text)
        if self.stack:
            self.stack[-1][2] = self.stack[-1][2] and tag in INLINE
        if tag in VOID or text.endswith('/>'):
            return
        self.stack.append([tag, end, True, False, tag in SKIP])

    def handle_startendtag(self, tag, attrs):
        start = self.off()
        text = self.get_starttag_text()
        if not any(e[4] for e in self.stack):
            self._attrs(tag, attrs, start, text)
        if self.stack:
            self.stack[-1][2] = self.stack[-1][2] and tag in INLINE

    def _attrs(self, tag, attrs, start, text):
        d = dict(attrs)
        names = set(ATTRS)
        if tag == 'meta' and (d.get('name') in META or d.get('property') in META):
            names.add('content')
        if tag == 'a' and 'href' in d and 'wa.me/' in (d['href'] or '') and 'text=' in d['href']:
            names.add('href')
        for name in names:
            m = re.search(r'\s%s="([^"]*)"' % re.escape(name), text)
            if m and m.group(1).strip():
                self.attrs.append((start + m.start(1), start + m.end(1), name))

    def handle_endtag(self, tag):
        pos = self.off()
        while self.stack:
            e = self.stack.pop()
            if e[0] == tag:
                break
        else:
            return
        t, inner, pure, has_text, skip = e
        if skip:
            if self.stack:
                self.stack[-1][2] = self.stack[-1][2] and t in INLINE
            return
        content = self.src[inner:pos]
        if self.stack:
            parent = self.stack[-1]
            parent[2] = parent[2] and pure and t in INLINE
            parent[3] = parent[3] or has_text
        if pure and has_text:
            # candidato; se anche il genitore è un blocco di solo testo vince il più esterno
            self.blocks.append((inner, pos))

    def handle_data(self, data):
        if self.stack and not self.stack[-1][4] and LETTER.search(data):
            self.stack[-1][3] = True
            if not self.stack[-1][2] or self.stack[-1][0] not in INLINE:
                pass

    def handle_entityref(self, name):
        pass

    def handle_charref(self, name):
        pass


def nest_clean(blocks):
    """Tiene solo i blocchi più esterni."""
    blocks = sorted(set(blocks), key=lambda b: (b[0], -b[1]))
    out, end = [], -1
    for b in blocks:
        if b[0] >= end:
            out.append(b)
            end = b[1]
    return out


def split_ws(s):
    m = re.match(r'^(\s*)(.*?)(\s*)$', s, re.S)
    return m.group(1), m.group(2), m.group(3)


def wa_text(href):
    u = urllib.parse.urlsplit(html.unescape(href))
    q = urllib.parse.parse_qs(u.query)
    return q.get('text', [None])[0]


def segments_of(src, js=False):
    p = Segmenter(src)
    p.feed(src)
    out = []  # (start, end, kind)
    for s, e in nest_clean(p.blocks):
        out.append((s, e, 'html'))
    for s, e, name in p.attrs:
        out.append((s, e, 'href' if name == 'href' else 'attr'))
    m = re.search(r'<title>(.*?)</title>', src, re.S)
    out.append((m.start(1), m.end(1), 'html'))
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', src, re.S):
        out.append((m.start(1), m.end(1), 'json'))
    if js:
        for s, e, q, t in js_literals(src):
            out.append((s, e, 'js' + q))
    # niente sovrapposizioni: gli attributi dentro un blocco li gestisce mask/unmask
    out.sort(key=lambda x: (x[0], -x[1]))
    res, last = [], -1
    for s, e, k in out:
        if s >= last:
            res.append((s, e, k))
            last = e
    return res


JS_LIT = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"")
JS_SKIP = {'Escape', 'Enter', 'POST', 'Content-Type', 'Bearer ', 'NFD', 'HTTP '}
# testi degli script che restano in italiano: arrivano al gestionale (li legge lo staff) o sono nomi propri
JS_KEEP = {'📎 Materiale per il menu in preparazione', 'materiale aggiuntivo', 'DS Service attivazione:', 'DS Service assistenza:',
           '🌐 Modulo compilato in '}


def js_unescape(t):
    return re.sub(r"\\(['\"\\])", r'\1', t)


def js_escape(t, q):
    return t.replace('\\', '\\\\').replace(q, '\\' + q).replace('\n', '\\n')


def js_strings(js):
    """Stringhe '...' e "..." di uno script, saltando commenti e template `...`. -> (inizio, fine, apice)"""
    i, n = 0, len(js)
    while i < n:
        c = js[i]
        if c == '/' and js.startswith('//', i):
            j = js.find('\n', i)
            i = n if j < 0 else j
        elif c == '/' and js.startswith('/*', i):
            j = js.find('*/', i + 2)
            i = n if j < 0 else j + 2
        elif c in '\'"`':
            j = i + 1
            while j < n and js[j] != c:
                if js[j] == '\\':
                    j += 1
                elif js[j] == '\n' and c != '`':
                    break
                j += 1
            if c != '`' and j < n and js[j] == c:
                yield i + 1, j, c
            i = j + 1
        else:
            i += 1


def js_literals(src):
    """Stringhe degli script della pagina (non i JSON-LD né gli script esterni)."""
    for m in re.finditer(r'<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>(.*?)</script>', src, re.S):
        a, js = m.start(1), m.group(1)
        for s, e, q in js_strings(js):
            t = js_unescape(js[s:e])
            if t in JS_SKIP or not LETTER.search(t):
                continue
            yield a + s, a + e, q, t


def js_is_text(t):
    """Per extract: sembra un testo per le persone (non codice, classi CSS, indirizzi)."""
    if re.search(r'(^|\s)(dsf|is|has)-[\w-]+|^[a-z]+/[\w.+-]+$|[a-z-]+:[^ ]*;|^\(|^:[a-z]|^\??[a-z]+$|^[A-Z]{2}( [A-Z]{2})+ ?$|^ ?[KM]B\.?$|\.jpg|^px;|<span', t):
        return False
    if re.search(r'^(https?:|/|#|\.[\w-]+($|[ .:>\[{]))', t) or re.search(r'[{};]\s*$', t):
        return False
    if re.fullmatch(r'[\w.:#\[\]=*>(),"-]+', t) and not re.search(r'[àèéìòù]', t):
        return re.fullmatch(r'[A-ZÀ-Ù][a-zà-ù]+[.!?…:]?', t) is not None
    return True


TAG = re.compile(r'<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>')


def mask(core):
    """'<a href="x">Ciao</a> <br>' -> ('<1>Ciao</1> <2/>', {1: ('<a href="x">', '</a>'), 2: ('<br>', '')})"""
    tags, stack, n = {}, [], [0]

    def sub(m):
        close, name, selfc = m.group(1), m.group(2).lower(), m.group(4)
        if close:
            if stack and stack[-1][1] == name:
                i = stack.pop()[0]
                tags[i] = (tags[i][0], m.group(0))
                return '</%d>' % i
            return m.group(0)
        n[0] += 1
        i = n[0]
        if selfc or name in VOID:
            tags[i] = (m.group(0), '')
            return '<%d/>' % i
        tags[i] = (m.group(0), '')
        stack.append((i, name))
        return '<%d>' % i

    return TAG.sub(sub, core), tags


def tag_strings(tagtext):
    """Testi traducibili dentro un tag (aria-label, alt, title, data-wa, testo WhatsApp)."""
    out = []
    for name in ATTRS:
        m = re.search(r'\s%s="([^"]*)"' % re.escape(name), tagtext)
        if m and LETTER.search(m.group(1)):
            out.append(html.unescape(m.group(1)))
    m = re.search(r'\shref="(https://wa\.me/[^"]*text=[^"]*)"', tagtext)
    if m:
        t = wa_text(m.group(1))
        if t:
            out.append(t)
    return out


def tag_translate(tagtext, tr):
    for name in ATTRS:
        tagtext = re.sub(r'(\s%s=")([^"]*)(")' % re.escape(name),
                         lambda m: m.group(1) + (html.escape(tr(html.unescape(m.group(2))), quote=True) if LETTER.search(m.group(2)) else m.group(2)) + m.group(3),
                         tagtext)

    def wa(m):
        t = wa_text(m.group(2))
        return m.group(1) + (m.group(2).split('?text=')[0] + '?text=' + urllib.parse.quote(tr(t)) if t else m.group(2)) + m.group(3)
    return re.sub(r'(\shref=")(https://wa\.me/[^"]*)(")', wa, tagtext)


def unmask(masked, tags, tr):
    def sub(m):
        close, i, selfc = m.group(1), int(m.group(2)), m.group(3)
        if i not in tags:
            return ''
        op, cl = tags[i]
        if close:
            return cl
        return tag_translate(op, tr)
    return re.sub(r'<(/?)(\d+)(/?)>', sub, masked)


JSON_KEYS = {'name', 'text', 'description', 'audienceType', 'alternateName', 'slogan'}


def json_strings(obj, acc):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in JSON_KEYS and isinstance(v, str) and LETTER.search(v):
                acc.append(v)
            else:
                json_strings(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            json_strings(v, acc)


def json_translate(obj, tr):
    if isinstance(obj, dict):
        return {k: (tr(v) if k in JSON_KEYS and isinstance(v, str) and LETTER.search(v) else json_translate(v, tr)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [json_translate(v, tr) for v in obj]
    return obj


def strip_lang(src):
    """Il selettore di lingua è generato, non si traduce."""
    return re.sub(r'<details class="lang">.*?</details>\n?\s*', '', src, flags=re.S)


def collect(src, js=False):
    src = strip_lang(src)
    found = []
    for s, e, k in segments_of(src, js):
        raw = src[s:e]
        if k == 'html':
            _, core, _ = split_ws(raw)
            if LETTER.search(re.sub(r'<[^>]+>', '', core)):
                key, tags = mask(core)
                found.append(key)
                for op, _ in tags.values():
                    found.extend(tag_strings(op))
        elif k == 'attr':
            found.append(html.unescape(raw))
        elif k == 'href':
            t = wa_text(raw)
            if t:
                found.append(t)
        elif k == 'json':
            json_strings(json.loads(raw), found)
        elif k.startswith('js'):
            t = js_unescape(raw)
            if js_is_text(t):
                found.append(t)
    return found


def extract():
    seen, order = set(), []
    for page in [p for p in PAGES if p not in IT_ONLY]:
        src = open(os.path.join(ROOT, page + '.html'), encoding='utf-8').read()
        for t in collect(src, page in JS_PAGES):
            if t not in seen and LETTER.search(t) and t not in JS_KEEP:
                seen.add(t)
                order.append(t)
    os.makedirs(DIR, exist_ok=True)
    json.dump(order, open(os.path.join(DIR, 'segments.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(order), 'testi')
    for lang in LANGS:
        if lang == 'it':
            continue
        f = os.path.join(DIR, lang + '.json')
        have = json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {}
        missing = [t for t in order if t not in have]
        print(lang, 'mancanti:', len(missing))


# ---------------------------------------------------------------- build

LOCAL_PAGES = set(PAGES) - IT_ONLY


def absolutize(src, lang):
    """I link relativi diventano assoluti; quelli alle pagine tradotte puntano alla lingua."""
    pre = '/' + lang + '/'
    home = '/' + lang

    def fix(m):
        attr, q, url = m.group(1), m.group(2), m.group(3)
        if re.match(r'^(https?:|mailto:|tel:|data:|#|/|javascript:)', url):
            return m.group(0)
        if url.startswith('./'):
            url = url[2:]
        path, sep, rest = re.match(r'^([^#?]*)([#?]?)(.*)$', url).groups()
        if path in ('', 'index') and attr == 'href':
            new = home + sep + rest if sep else home
        elif path in LOCAL_PAGES and attr == 'href':
            new = pre + path + sep + rest
        else:
            new = '/' + url
        return '%s=%s%s%s' % (attr, q, new, q)

    return re.sub(r'\b(href|src|data-src)=(["\'])([^"\']*)\2', fix, src)


def page_url(page, lang):
    # niente barra finale: con trailingSlash=false Vercel reindirizzerebbe /en/ -> /en
    if page == 'index':
        return SITE + ('/' if lang == 'it' else '/' + lang)
    return SITE + ('' if lang == 'it' else '/' + lang) + '/' + page


def alternates(page):
    if page in IT_ONLY:
        return '<link rel="alternate" hreflang="it" href="%s">' % page_url(page, 'it')
    out = ['<link rel="alternate" hreflang="%s" href="%s">' % (l, page_url(page, l)) for l in LANGS]
    out.append('<link rel="alternate" hreflang="x-default" href="%s">' % page_url(page, 'it'))
    return '\n'.join(out)


def switcher(page, lang):
    items = ''.join('<a href="%s" hreflang="%s" lang="%s"%s>%s</a>' % (
        page_url('index' if (page in IT_ONLY and l != 'it') else page, l).replace(SITE, ''), l, l, ' aria-current="true"' if l == lang else '', LANGS[l][1]) for l in LANGS)
    return ('<details class="lang"><summary aria-label="Lingua / Language"><span aria-hidden="true">🌐</span> %s</summary>'
            '<div class="lang-list">%s</div></details>') % (lang.upper(), items)


def localize_common(src, page, lang):
    """Parti uguali in tutte le lingue: hreflang, selettore lingua."""
    src = re.sub(r'\n<link rel="alternate" hreflang="[^"]*" href="[^"]*">', '', src)
    src = re.sub(r'<details class="lang">.*?</details>', '', src, flags=re.S)
    src = re.sub(r'(<link rel="canonical" href="[^"]*">)', r'\1\n' + alternates(page).replace('\\', '\\\\'), src, count=1)
    if '<button class="burger"' in src:
        src = src.replace('<button class="burger"', switcher(page, lang) + '\n      <button class="burger"', 1)
    else:
        # pagine Attiva e Assistenza: il selettore va dopo la navigazione dell'intestazione
        src = re.sub(r'(<header class="top">.*?</nav>)', lambda m: m.group(1) + '\n      ' + switcher(page, lang), src, count=1, flags=re.S)
    return src


def translate_page(src, page, lang, d):
    missing = []

    def tr(t):
        if t in d:
            return d[t]
        missing.append(t)
        return t

    out, pos = [], 0
    for s, e, k in segments_of(src, page in JS_PAGES):
        out.append(src[pos:s])
        raw = src[s:e]
        if k == 'html':
            a, core, b = split_ws(raw)
            if LETTER.search(re.sub(r'<[^>]+>', '', core)):
                key, tags = mask(core)
                core = unmask(tr(key), tags, tr)
            out.append(a + core + b)
        elif k == 'attr':
            out.append(html.escape(tr(html.unescape(raw)), quote=True))
        elif k == 'href':
            t = wa_text(raw)
            out.append(raw.split('?text=')[0] + '?text=' + urllib.parse.quote(tr(t)) if t else raw)
        elif k == 'json':
            data = json_translate(json.loads(raw), tr)
            out.append(json.dumps(data, ensure_ascii=False))
        elif k.startswith('js'):
            t = js_unescape(raw)
            # nello script si traduce solo ciò che è nel dizionario (il resto è codice o resta in italiano)
            out.append(js_escape(d[t], k[2]) if t in d and t not in JS_KEEP else raw)
        pos = e
    out.append(src[pos:])
    res = ''.join(out)
    res = res.replace('<html lang="it">', '<html lang="%s">' % lang, 1)
    res = res.replace('<meta property="og:locale" content="it_IT">', '<meta property="og:locale" content="%s">' % LANGS[lang][0])
    res = res.replace('"inLanguage": "it-IT"', '"inLanguage": "%s"' % lang)
    res = absolutize(res, lang)
    # canonical, og:url e indirizzi nel JSON puntano alla versione nella lingua
    res = re.sub(r'(<link rel="canonical" href=")[^"]*(">)', r'\g<1>%s\2' % page_url(page, lang), res)
    res = re.sub(r'(<meta property="og:url" content=")[^"]*(">)', r'\g<1>%s\2' % page_url(page, lang), res)
    for p in PAGES:
        res = res.replace('"%s"' % page_url(p, 'it'), '"%s"' % page_url(p, lang))
    # link assoluti a dsfabio.com (pagine Attiva e Assistenza): stessa pagina nella lingua scelta
    def absfix(m):
        path, rest = m.group(1), m.group(2) or ''
        if path == '':
            return 'href="/%s%s"' % (lang, rest)
        if path in LOCAL_PAGES:
            return 'href="/%s/%s%s"' % (lang, path, rest)
        return m.group(0)
    return localize_common(res, page, lang), missing


def build():
    allmiss = {}
    for page in PAGES:
        it_path = os.path.join(ROOT, page + '.html')
        src = strip_lang(open(it_path, encoding='utf-8').read())
        open(it_path, 'w', encoding='utf-8').write(localize_common(src, page, 'it'))
        for lang in LANGS:
            if lang == 'it' or page in IT_ONLY:
                continue
            d = json.load(open(os.path.join(DIR, lang + '.json'), encoding='utf-8'))
            res, miss = translate_page(src, page, lang, d)
            os.makedirs(os.path.join(ROOT, lang), exist_ok=True)
            open(os.path.join(ROOT, lang, page + '.html'), 'w', encoding='utf-8').write(res)
            if miss:
                allmiss.setdefault(lang, set()).update(miss)
    for lang, m in allmiss.items():
        print(lang, 'testi non tradotti:', len(m))
        for t in sorted(m)[:20]:
            print('   ', t[:100])
    sitemap()


def sitemap():
    alts = ''.join('\n    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (l, page_url('index', l)) for l in LANGS)
    rows = ['  <url><loc>%s</loc><priority>%s</priority>%s\n  </url>' % (page_url('index', l), '1.0' if l == 'it' else '0.8', alts) for l in LANGS]
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(rows) + '\n</urlset>\n')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(xml)


if __name__ == '__main__':
    {'extract': extract, 'build': build}[sys.argv[1]]()
