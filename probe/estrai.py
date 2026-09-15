import re, json, sys, html
src = open(sys.argv[1], encoding='utf-8', errors='ignore').read()
src = src.replace('\\/', '/').replace('\\u002F', '/').replace('&#x2F;', '/')
out = {}
# JSON-LD
out['ld'] = []
for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', src, re.S):
    try: out['ld'].append(json.loads(m.group(1)))
    except Exception as e: out['ld'].append({'err': str(e), 'raw': m.group(1)[:500]})
# varianti
vs = []
for m in re.finditer(r'"Sku":"([A-Z0-9]+)"(.{0,600}?)"Upc":"?([0-9]*)"?', src, re.S):
    seg = m.group(2)
    def g(k):
        mm = re.search(r'"%s":"([^"]*)"' % k, seg); return mm.group(1) if mm else ''
    vs.append({'sku': m.group(1), 'color': g('ColorName'), 'swatch': g('ColorSwatch'), 'size': g('Size'), 'upc': m.group(3),
               'price': g('Price') or g('FormattedPrice'), 'avail': g('Availability')})
seen=set(); out['variants']=[v for v in vs if not (v['sku'] in seen or seen.add(v['sku']))]
# prezzi grezzi
out['prices'] = sorted(set(re.findall(r'"(?:Price|ListPrice|SalePrice|price)":\s*"?([0-9]+(?:[.,][0-9]+)?)"?', src)))[:40]
# swatch
out['swatches'] = re.findall(r'pdp__color-select[^>]*data-color="([^"]*)"[^>]*aria-label="([^"]*)"', src)
# immagini widen
imgs = sorted(set(re.findall(r'widencdn\.net/img/dorelrl/([a-z0-9]+)/[^"\'\s>]*?/([A-Za-z0-9_\-]+)\.(?:png|jpg|webp)', src)))
imgs = [(a, f + '.png') for a, f in imgs]
out['nomi_c65134u'] = sorted(set(re.findall(r'C2[0-9]_C65134U[A-Za-z0-9_\-]+', src)))
out['dorelrl_count'] = src.count('dorelrl')
out['images'] = [{'id': a, 'file': f} for a, f in imgs]
# testo visibile
t = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', src, flags=re.S)
t = re.sub(r'<[^>]+>', '\n', t); t = html.unescape(t)
t = re.sub(r'[ \t]+', ' ', t); t = re.sub(r'\n\s*\n+', '\n', t)
out['text_len'] = len(t)
i = t.find('Specifiche'); j = t.find('IN BASE ALLA DISPONIBILIT', i)
out['specs'] = t[i:j+40] if i >= 0 else t[:3000]
k = t.find('Descrizione'); out['desc_area'] = t[k:k+2500] if k >= 0 else ''
out['title'] = re.findall(r'<title>(.*?)</title>', src, re.S)[:1]
out['meta_desc'] = re.findall(r'<meta name="description" content="([^"]*)"', src)[:1]
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('variants', len(out['variants']), 'images', len(out['images']), 'swatches', len(out['swatches']))
