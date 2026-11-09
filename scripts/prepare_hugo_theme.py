#!/usr/bin/env python3
import copy
import json
import pathlib
import re
import subprocess
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = 'e9f4bd09656d5a50c84513ef0872a8b82f8a5bab'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def clean(value):
    value = value.strip().replace('**', '')
    link = re.search(r'\[[^]]*\]\(([^)]+)\)', value)
    value = link.group(1) if link else value
    return re.sub(r'\\(.)', r'\1', value).strip()

def href(value):
    value = re.sub(r'^https://jon\.doblados\.net/(?:poc|ambsaas)/', '', value)
    return value.lstrip('/') if not re.match(r'^[a-z]+:', value) else value

def main():
    subprocess.run(['git', 'fetch', '--depth=1', 'origin', SOURCE], cwd=ROOT, check=True)
    names = git('ls-tree', '-r', '--name-only', SOURCE, 'static/brand').decode().splitlines()
    if not names:
        raise RuntimeError('Pinned POC2 branding is missing')
    for name in names:
        target = ROOT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(git('show', f'{SOURCE}:{name}'))
    css = git('show', f'{SOURCE}:app/globals.css').decode().replace('../static/brand/', 'brand/')
    font_css = ''
    try:
        request = urllib.request.Request('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Nunito+Sans:wght@600;700&display=swap', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=30) as response:
            source = response.read().decode()
        blocks = re.findall(r'/\* latin \*/\s*(@font-face\s*\{[^}]+\})', source) or re.findall(r'@font-face\s*\{[^}]+\}', source)
        fonts = ROOT / 'static/fonts'
        fonts.mkdir(parents=True, exist_ok=True)
        for i, block in enumerate(blocks):
            url = re.search(r'url\((https://[^)]+)\)', block).group(1)
            ext = '.woff2' if '.woff2' in url else '.ttf'
            name = f'theme-{i}{ext}'
            with urllib.request.urlopen(url, timeout=30) as response:
                (fonts / name).write_bytes(response.read())
            font_css += block.replace(url, f'fonts/{name}') + '\n'
    except Exception as exc:
        print(f'Font download unavailable; using local font fallbacks: {exc}')
    adapters = '''
:root{--font-open-sans:"Open Sans";--font-nunito:"Nunito Sans"}
.hugo-menu-toggle{display:none}.hugo-page-title h1{margin:0}.hugo-content{min-width:0}.hugo-content img{max-width:100%}.hugo-content>p:has(>img:only-child){text-align:center;margin:28px auto}.hugo-content>p>img:only-child{margin:auto;max-height:440px;width:auto;border-radius:4px;box-shadow:var(--shadow)}
.hugo-post-cover img{width:100%;height:auto}.hugo-person-photo img{width:100%;height:auto}.share a{width:auto;padding:0 12px;border-radius:4px;text-decoration:none}.value-symbol{font-size:2rem;font-weight:700}.footer-logo img{height:auto}.site-nav summary{cursor:pointer}.menu>li>a.home-link{display:flex}.content th a:not(.button){color:#fff}.content th a:not(.button):hover{color:var(--purple-dark);background:var(--gold)}
@media(max-width:960px){.hugo-menu-toggle{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;background:transparent;border:1px solid var(--purple);color:var(--purple);border-radius:4px}.site-nav{position:static;inset:auto;transform:none;visibility:visible;display:block;padding:0;background:white}.site-header .container{flex-wrap:wrap}.site-header .site-nav{flex-basis:100%;border:0;padding-bottom:16px}.js .site-header .site-nav{display:none}.js .site-header .site-nav.open{display:block}}
'''
    (ROOT / 'assets').mkdir(exist_ok=True)
    (ROOT / 'assets/site.css').write_text(font_css + css + adapters)
    h = {
      'banner': {'label':'AMBSAAS','heading':'Power Your Network for Your Future.','text':'Join Us','link':'membership/'},
      'follow': {'heading':'Stay connected. Follow AMBSAAS for news and events!','text':'Follow on LinkedIn','link':'https://www.linkedin.com/company/mbsaas/'},
      'mission': {'label':'OUR MISSION','heading':'The Alliance Manchester Business School Alumni Association of Singapore','text':'About AMBSAAS','link':'about-ambsaas/','body':'The Alliance Manchester Business School Alumni Association of Singapore, AMBSAAS, aims to support lifelong relationships between the alumni and our alma mater.\n\nAMBSAAS is about the leverage of network: professional networking, entrepreneurial advisory and more, and giving back to the community through initiatives such as the Manchester Day of Action.','photos':[]},
      'values': {'label':'OUR VALUES','heading':'Connect, collaborate and grow with AMBS alumni','items':[{'title':'Connect','text':'To channel the alumni into a vibrant network of high-potential people'},{'title':'Collaborate','text':'A platform for ideation and joint opportunities'},{'title':'Commerce','text':'Enabling and supporting the success of business-minded individuals in our network'}]},
      'news': {'label':'Save the Date','heading':'Latest News & Events','text':'All news','link':'posts/','count':6},
      'explore': {'label':'Explore','heading':'As an AMBS alumnus, you are supported.'},
      'join': {'heading':'Be part of the AMBSAAS Community today!','text':'Contact Us','link':'contact-us/'}
    }
    doc = ROOT / 'content/home/index.md'
    if doc.exists():
        source = re.sub(r'\A---\n.*?\n---\n', '', doc.read_text(), flags=re.S)
        sections = {}
        current = None
        for line in source.splitlines():
            match = re.match(r'^# (.+)$', line)
            if match:
                current = re.sub(r'[^a-z ]', '', clean(match.group(1)).lower()).strip()
                sections[current] = []
            elif current is not None:
                sections[current].append(line)
        aliases = {'follow us':'follow','our mission':'mission','our values':'values','latest news':'news','join us':'join'}
        for name, lines in sections.items():
            key = aliases.get(name, name)
            if key not in h:
                continue
            fields, rest, used = {}, [], False
            i = 0
            while i < len(lines):
                if not used and lines[i].lstrip().startswith('|'):
                    while i < len(lines) and lines[i].lstrip().startswith('|'):
                        cells = lines[i].strip().strip('|').split('|', 1)
                        if len(cells) == 2:
                            field, value = clean(cells[0]).lower().rstrip(':'), clean(cells[1])
                            if field not in ('field', '') and not re.fullmatch(r'[: -]+', field) and value and not (value.startswith('(') and value.endswith(')')):
                                fields[field] = value
                        i += 1
                    used = True
                else:
                    rest.append(lines[i]); i += 1
            for field, target in [('small text','label'),('heading','heading'),('button text','text'),('button link','link')]:
                if field in fields:
                    h[key][target] = fields[field]
            if fields.get('button text', '').lower() == 'none':
                h[key]['text'] = ''
            if key == 'news':
                try: h[key]['count'] = max(1, min(12, int(fields.get('number of posts', 6))))
                except ValueError: pass
            if key == 'mission':
                body = '\n'.join(rest).strip()
                photos = re.findall(r'!\[[^]]*\]\(([^)]+)\)', body)[:2]
                h[key]['photos'] = photos
                body = re.sub(r'(?m)^\s*!\[[^]]*\]\([^)]+\)\s*$', '', body).strip()
                body = re.sub(r'(?m)^\s*\((?:insert|optional|delete|paste|leave)\b[^)]*\)\s*$', '', body, flags=re.I).strip()
                if body: h[key]['body'] = body
            if key == 'values':
                items = []
                for line in rest:
                    match = re.match(r'^#{2,6} (.+)$', line)
                    if match: items.append({'title':clean(match.group(1)), 'text':''})
                    elif items and line.strip() and not line.strip().startswith('('):
                        items[-1]['text'] = (items[-1]['text'] + ' ' + clean(line)).strip()
                if items: h[key]['items'] = items[:6]
    for section in h.values():
        if 'link' in section: section['link'] = href(section['link'])
    (ROOT / 'data/theme_home.json').write_text(json.dumps(h, ensure_ascii=False))
    # Normalize simple single-column layout tables only in the build checkout.
    # The audited content commit and original Google Docs remain untouched.
    for file in (ROOT / 'content').rglob('*.md'):
        if file.parent.name == 'home': continue
        text = file.read_text()
        lines, out, i = text.splitlines(), [], 0
        while i < len(lines):
            if lines[i].strip().startswith('|'):
                group = []
                while i < len(lines) and lines[i].strip().startswith('|'):
                    group.append(lines[i]); i += 1
                cells = [re.split(r'(?<!\\)\|', line.strip().strip('|')) for line in group]
                if len(cells) >= 2 and all(len(row) == 1 for row in cells) and re.fullmatch(r'\s*:?-+:?\s*', cells[1][0]):
                    for row in cells[:1] + cells[2:]:
                        if row[0].strip(): out.extend([row[0].strip(), ''])
                else: out.extend(group)
            else: out.append(lines[i]); i += 1
        file.write_text('\n'.join(out) + '\n')

if __name__ == '__main__':
    main()
