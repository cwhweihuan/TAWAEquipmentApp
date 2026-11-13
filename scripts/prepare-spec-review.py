"""Download public spec PDFs and extract paginated text for review in this workspace.
Requires PyMuPDF: python3 -m pip install --target /tmp/tawa-pdf-tools pymupdf
Run: PYTHONPATH=/tmp/tawa-pdf-tools python3 scripts/prepare-spec-review.py
No AI provider key or database connection is used. Scanned PDFs need visual review.
"""
import argparse
import concurrent.futures
import hashlib
import json
import time
from urllib.error import HTTPError
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

import pymupdf

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--snapshot', default='data/extractions/catalog-snapshot.json')
parser.add_argument('--output', default='/tmp/tawa-spec-review')
parser.add_argument('--item', type=int, action='append')
args = parser.parse_args()
snapshot = json.loads(Path(args.snapshot).read_text())
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)
review_path = Path('data/extractions/reviewed-specs.json')
reviewed = {r['itemNo'] for r in json.loads(review_path.read_text())} if review_path.exists() else set()
items = [item for item in snapshot['equipment'] if item.get('pdfUrl') and item['masterItemNo'] not in reviewed and (not args.item or item['masterItemNo'] in args.item)]
# Restrict downloads to this project's public Storage, never arbitrary URLs in source data.
allowed_host = 'zlhmnmtfpvingqtwxcvs.supabase.co'


def prepare(item):
    number = item['masterItemNo']
    base = output / str(number)
    record = {'itemNo': number, 'equipmentId': item['id'], 'manufacturer': item.get('manufacturer'),
              'model': item.get('model'), 'description': item['description'], 'pdfUrl': item['pdfUrl']}
    try:
        url = urlparse(item['pdfUrl'])
        if url.scheme != 'https' or url.hostname != allowed_host or not url.path.startswith('/storage/v1/object/public/'):
            raise ValueError('PDF URL is outside this project public Storage')
        pdf = base.with_suffix('.pdf')
        if not pdf.exists():
            for attempt in range(4):
                try:
                    with urlopen(item['pdfUrl'], timeout=60) as response:
                        data = response.read(50 * 1024 * 1024 + 1)
                    break
                except HTTPError as error:
                    if error.code != 429 or attempt == 3: raise
                    time.sleep(2 ** (attempt + 1))
            time.sleep(0.25)
            if len(data) > 50 * 1024 * 1024 or b'%PDF-' not in data[:1024]:
                raise ValueError('Invalid or oversized PDF')
            temporary = pdf.with_suffix('.pdf.tmp')
            temporary.write_bytes(data)
            temporary.replace(pdf)
        data = pdf.read_bytes()
        pages = []
        with pymupdf.open(pdf) as document:
            for page in document:
                pages.append(page.get_text(sort=True))
        text = '\n\n'.join(f'=== PDF PAGE {index + 1} ===\n{text}' for index, text in enumerate(pages))
        base.with_suffix('.txt').write_text(text)
        page_file = base.with_suffix('.pages.json')
        page_file.write_text(json.dumps(pages, ensure_ascii=False, indent=2) + '\n')
        record.update({'status': 'ready' if sum(len(p.strip()) for p in pages) >= 80 else 'needs_visual_review',
                       'pages': len(pages), 'sha256': hashlib.sha256(data).hexdigest(),
                       'pdfFile': str(pdf), 'textFile': str(base.with_suffix('.txt')), 'pagesFile': str(page_file)})
    except Exception as error:
        record.update({'status': 'failed', 'error': str(error)})
    return record


old_manifest = output / 'manifest.json'
previous = json.loads(old_manifest.read_text())['records'] if old_manifest.exists() else []
records = [r for r in previous if r['itemNo'] in reviewed]
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
    for record in pool.map(prepare, items):
        records.append(record)
        manifest = output / 'manifest.json'
        temporary = output / 'manifest.json.tmp'
        temporary.write_text(json.dumps({'source': args.snapshot, 'records': records}, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(manifest)
        print(f"#{record['itemNo']}: {record['status']}", flush=True)
print(json.dumps({status: sum(r['status'] == status for r in records)
                  for status in ['ready', 'needs_visual_review', 'failed']}))
