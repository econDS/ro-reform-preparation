"""Resolve item IDs against iRO Wiki and download transparent Divine Pride icons."""
import json
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

PAGE = 'https://irowiki.org/wiki/Item_Reform'
IDS = [*range(1000430, 1000442), 1000419, 1000420, 1000423, 1000424,
       1000426, 1000427, 25728, 25729]
DEST = Path(__file__).resolve().parents[1] / 'assets' / 'items'

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0 ReformWorkshop'}), timeout=30) as response:
        return response.read()

class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = {}

    def handle_starttag(self, tag, attrs):
        if tag != 'img':
            return
        attrs = dict(attrs)
        url = urljoin(PAGE, attrs.get('src', ''))
        for item in IDS:
            if urlparse(url).path.endswith('/' + str(item) + '.png'):
                if urlparse(url).hostname not in ['irowiki.org', 'www.irowiki.org', 'db.irowiki.org']:
                    raise ValueError('Unexpected image host')
                self.urls[item] = url

parser = Images()
parser.feed(fetch(PAGE).decode())
if set(parser.urls) != set(IDS):
    raise ValueError(f'Missing image URLs: {set(IDS) - set(parser.urls)}')
DEST.mkdir(parents=True, exist_ok=True)

def download(item):
    source = f'https://www.divine-pride.net/img/items/item/kROM/{item}'
    data = fetch(source)
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError(f'Not a PNG: {item}')
    (DEST / f'{item}.png').write_bytes(data)
    return {'id': item, 'source': source, 'wiki_reference': parser.urls[item], 'bytes': len(data)}

with ThreadPoolExecutor(max_workers=4) as pool:
    sources = list(pool.map(download, IDS))
(DEST / 'sources.json').write_text(json.dumps({'page': PAGE, 'images': sources}, indent=2), encoding='utf-8')
print(f'Downloaded {len(sources)} verified PNG files ({sum(s["bytes"] for s in sources):,} bytes)')
