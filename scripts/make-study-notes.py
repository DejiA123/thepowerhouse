"""
Makes public/study-notes/: classic Christian study notes, one small JSON file
per chapter, that the app serves itself (Bible → Study notes → "Notes from").

  geneva   The Geneva Bible notes (1599), the first Protestant study Bible's
           notes, verse by verse. Public domain. Taken from the per-chapter
           files of github.com/samueldotj/bible-commentaries (en/geneva),
           which were read from CrossWire's SWORD "Geneva" module.
  mhcc     Matthew Henry's Concise Commentary: practical notes on every
           passage. Public domain ("Public Domain--Copy Freely"). Read here
           from CrossWire's SWORD "MHCC" module, as committed in
           github.com/spearssoftware/open-commentaries (sources/mhcc).

    git clone --depth 1 https://github.com/samueldotj/bible-commentaries
    git clone --depth 1 https://github.com/spearssoftware/open-commentaries
    python scripts/make-study-notes.py bible-commentaries open-commentaries/sources/mhcc

Each chapter: {"notes": [{"v": 1, "to": 8, "p": ["paragraph", ...], "label"?: "Outline"}]}
Each book:    {"intro": "paragraphs separated by blank lines"} in book.json
Files are named by USFM book code: public/study-notes/{id}/{BOOK}/{chapter}.json
"""
import html
import json
import pathlib
import re
import shutil
import struct
import sys
import zlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'study-notes'


def write(source: str, book: str, name: str, data: dict) -> int:
    path = OUT / source / book / f'{name}.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    path.write_text(text, encoding='utf-8')
    return len(text.encode('utf-8'))


def clean(text: str) -> str:
    text = html.unescape(re.sub(r'<[^>]+>', ' ', text))
    text = re.sub(r'\s+', ' ', text).strip()
    return re.sub(r' +([,.;:?!)])', r'\1', text)


# ── Geneva (per-chapter JSON from bible-commentaries) ──────────────────

def geneva(repo: pathlib.Path) -> tuple[int, int]:
    files = size = 0
    for book_dir in sorted((repo / 'en' / 'geneva').iterdir()):
        book = book_dir.name
        intro = book_dir / 'intro.json'
        if intro.exists():
            units = json.loads(intro.read_text(encoding='utf-8'))['units']
            paras = [p['text'] for u in units for p in u['paragraphs'] if p.get('text')]
            if paras:
                size += write('geneva', book, 'book', {'intro': '\n\n'.join(paras)})
                files += 1
        for file in book_dir.glob('[0-9]*.json'):
            chapter = json.loads(file.read_text(encoding='utf-8'))
            notes = []
            for unit in chapter['units']:
                m = re.match(r'^[1-3A-Z]{3}\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$', unit['range'])
                if not m or unit['kind'] == 'book':
                    continue
                v = int(m.group(2) or 1)
                to = int(m.group(3) or v)
                paras = []
                for p in unit['paragraphs']:
                    text = (p.get('text') or '').strip()
                    if not text or p.get('heading'):
                        continue
                    # The KJV words the note explains lead it, like a study Bible's notes
                    anchor = (p.get('anchor') or '').strip().rstrip(',;:')
                    paras.append(f'{anchor}: {text}' if anchor else text)
                if paras:
                    note = {'v': v, 'to': to, 'p': paras}
                    if unit['kind'] == 'chapter':
                        note['label'] = 'Chapter'
                    notes.append(note)
            if notes:
                size += write('geneva', book, file.stem, {'notes': notes})
                files += 1
    return files, size


# ── Matthew Henry's Concise Commentary (CrossWire SWORD zCom module) ───────

def zcom(module: pathlib.Path, versification: list[dict]):
    """
    Entries in KJV order: (book, chapter, verse, key, markup). Per testament:
    .bzs = block index (offset, compressed size, size: 3 x u32), .bzv = one
    slot per position (block u32, offset u32, size u16), .bzz = zlib blocks.
    Slots: module heading, testament heading, then each book's introduction
    and, for each chapter, its introduction followed by its verses. A comment
    on several verses is stored once and the other verses point to it.
    """
    data = next((module / 'modules' / 'comments' / 'zcom').iterdir())
    for testament, books in (('ot', versification[:39]), ('nt', versification[39:])):
        bzs = (data / f'{testament}.bzs').read_bytes()
        bzv = (data / f'{testament}.bzv').read_bytes()
        bzz = (data / f'{testament}.bzz').read_bytes()
        blocks = [struct.unpack_from('<III', bzs, i) for i in range(0, len(bzs), 12)]
        cache: dict[int, bytes] = {}

        def entry(slot: int):
            b, off, size = struct.unpack_from('<IIH', bzv, slot * 10)
            if not size or b >= len(blocks):
                return None, ''
            if b not in cache:
                o, c, _ = blocks[b]
                cache[b] = zlib.decompress(bzz[o:o + c])
            return (b, off, size), cache[b][off:off + size].decode('utf-8', 'replace')

        slot = 2
        for book in books:
            slot += 1  # the book's own slot (MHCC keeps its introductions in chapter 1)
            for ch, count in enumerate(book['verses'], 1):
                for v in range(0, count + 1):
                    key, text = entry(slot)
                    slot += 1
                    if text:
                        yield book['code'], ch, v, key, text


VERSES = re.compile(r'<hi type="bold">\s*Verses?\s+([\d\s,\-–]+?)\s*</hi>')
PARA = re.compile(r'<div sID="[^"]*" type="x-p"/>')


def paragraphs(markup: str) -> list[str]:
    # "--"The Lord is my shepherd."…": the dashes only introduced a quotation in print
    return [t for t in (re.sub(r'^-+\s*', '', clean(part)) for part in PARA.split(markup)) if t]


def mhcc(module: pathlib.Path, versification: list[dict]) -> tuple[int, int]:
    chapters: dict[tuple[str, int], list[str]] = {}
    seen: dict[tuple[str, int], set] = {}
    for book, ch, v, key, text in zcom(module, versification):
        if key in seen.setdefault((book, ch), set()):
            continue
        seen[(book, ch)].add(key)
        chapters.setdefault((book, ch), []).append(text)
    counts = {b['code']: b['verses'] for b in versification}
    files = size = 0
    for (book, ch), parts in chapters.items():
        markup = ' '.join(parts)
        # The book's introduction comes before "Chapter 1"
        m = re.search(r'<title type="x-ms">.*?</title>(.*?)<title type="x-s2">', markup, re.S)
        if m:
            intro = paragraphs(m.group(1))
            if intro:
                size += write('mhcc', book, 'book', {'intro': '\n\n'.join(intro)})
                files += 1
            markup = markup[m.end(1):]
        markup = re.sub(r'<title[^>]*>.*?</title>', ' ', markup, flags=re.S)
        notes = []
        outline = [f'{clean(a)} ({clean(b).strip("()")})'
                   for a, b in re.findall(r'<row><cell>(.*?)</cell><cell>(.*?)</cell></row>', markup, re.S)]
        markup = re.sub(r'<table>.*?</table>', ' ', markup, flags=re.S)
        if outline:
            notes.append({'v': 1, 'to': 1, 'label': 'Outline', 'p': outline})
        pieces = VERSES.split(markup)
        before = paragraphs(pieces[0])
        last = len(counts[book]) >= ch and counts[book][ch - 1] or 1
        if before and len(pieces) == 1:
            notes.append({'v': 1, 'to': last, 'p': before})  # the whole chapter (e.g. a psalm)
        elif before:
            notes.append({'v': 1, 'to': 1, 'p': before})
        for label, body in zip(pieces[1::2], pieces[2::2]):
            nums = [int(n) for n in re.findall(r'\d+', label)]
            paras = paragraphs(body)
            if nums and paras:
                notes.append({'v': nums[0], 'to': max(nums), 'p': paras})
        if notes:
            size += write('mhcc', book, str(ch), {'notes': notes})
            files += 1
    return files, size


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    commentaries, mhcc_module = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    versification = json.loads((commentaries / 'data' / 'kjv-versification.json').read_text(encoding='utf-8'))
    shutil.rmtree(OUT, ignore_errors=True)
    for name, (files, size) in (('geneva', geneva(commentaries)), ('mhcc', mhcc(mhcc_module, versification))):
        print(f'{name}: {files} files, {size / 1e6:.1f} MB')
