#!/usr/bin/env python3
"""
drive_to_hugo.py - Convert Google Docs in the LIVE Drive folder into Hugo content.

Rule: what is in the LIVE folder is what is on the website.
  LIVE/Posts/*  -> content/posts/<slug>/index.md  (+ images)
  LIVE/Pages/*  -> content/<slug>/index.md         (+ images)

Each Doc starts with a 2-column "Field | Value" table (see the Post Template),
followed by the body. The first image in the Doc becomes the cover / social image.

Modes
  build    (default) regenerate content/ from Drive; write .publish/report.json
  comment  post "Published" / "Could not publish" comments on Docs, based on the report

Auth: env GOOGLE_ACCESS_TOKEN (from google-github-actions/auth, Workload Identity
Federation). For local testing only, set DRIVE_BACKEND=gws to use the gws CLI.

Only the Python standard library is used, to keep maintenance simple.
"""
import base64
import datetime as dt
import hashlib
import html.parser
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content")
STATE_FILE = os.path.join(ROOT, "data", "drive_state.json")
REPORT_FILE = os.path.join(ROOT, ".publish", "report.json")
CONVERTER_VERSION = "2"  # bump to force a republish (and fresh Doc comments) after converter changes
SITE_URL = os.environ.get("SITE_URL", "https://jon.doblados.net/poc/").rstrip("/") + "/"

DOC_MIME = "application/vnd.google-apps.document"
FOLDER_MIME = "application/vnd.google-apps.folder"
ALLOWED_IMG = {"image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp"}
MAX_IMG_BYTES = 15 * 1024 * 1024
CATEGORIES = {"news", "event", "edm", "member spotlight"}
REQUIRED_POST = ["title", "publish date", "short summary"]
REQUIRED_PAGE = ["title"]


# --------------------------------------------------------------------------- Drive access
class Drive:
    """Tiny Drive v3 client. REST + bearer token in CI, gws CLI for local tests."""

    API = "https://www.googleapis.com/drive/v3"

    def __init__(self):
        self.backend = os.environ.get("DRIVE_BACKEND", "rest")
        self.token = os.environ.get("GOOGLE_ACCESS_TOKEN")
        if self.backend == "rest" and not self.token:
            sys.exit("GOOGLE_ACCESS_TOKEN is not set")

    def _rest(self, method, path, params=None, body=None, raw=False):
        url = f"{self.API}/{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {self.token}")
        if data:
            req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = r.read()
        return payload if raw else json.loads(payload or b"{}")

    def _gws(self, args, params, body=None, out=None):
        cmd = ["gws", "drive", *args, "--params", json.dumps(params)]
        if body is not None:
            cmd += ["--json", json.dumps(body)]
        if out:
            cmd += ["--output", out]
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
        if r.returncode:
            raise RuntimeError(f"gws failed: {r.stderr[-500:]}")
        return json.loads(r.stdout) if r.stdout.strip() else {}

    def list_children(self, folder_id):
        params = {
            "q": f"'{folder_id}' in parents and trashed = false",
            "fields": "nextPageToken, files(id,name,mimeType,modifiedTime,webViewLink)",
            "pageSize": 200,
            "supportsAllDrives": True,
            "includeItemsFromAllDrives": True,
            "orderBy": "name",
        }
        files, token = [], None
        for _ in range(20):  # hard cap on pagination
            if token:
                params["pageToken"] = token
            res = self._rest("GET", "files", params) if self.backend == "rest" else self._gws(["files", "list"], params)
            files += res.get("files", [])
            token = res.get("nextPageToken")
            if not token:
                break
        return files

    def export(self, file_id, mime="text/markdown"):
        params = {"mimeType": mime}
        if self.backend == "rest":
            return self._rest("GET", f"files/{file_id}/export", params, raw=True).decode("utf-8")
        tmp = os.path.join(".publish", f"{file_id}.{'md' if 'markdown' in mime else 'html'}")
        os.makedirs(os.path.join(ROOT, ".publish"), exist_ok=True)
        self._gws(["files", "export"], {"fileId": file_id, **params}, out=tmp)
        with open(os.path.join(ROOT, tmp), encoding="utf-8") as f:
            return f.read()

    def export_markdown(self, file_id):
        return self.export(file_id, "text/markdown")

    def add_comment(self, file_id, text):
        params = {"fields": "id", "supportsAllDrives": True}
        body = {"content": text}
        if self.backend == "rest":
            return self._rest("POST", f"files/{file_id}/comments", params, body)
        return self._gws(["comments", "create"], {"fileId": file_id, "fields": "id"}, body)


# --------------------------------------------------------------------------- parsing
TABLE_ROW = re.compile(r"^\s*\|(.+)\|\s*$")
IMG_REF_DEF = re.compile(r"^\[(image\d+)\]:\s*<data:(image/[a-z+]+);base64,([A-Za-z0-9+/=\s]+)>\s*$", re.M)
IMG_USE = re.compile(r"!\[([^\]]*)\]\[(image\d+)\]")
MD_LINK = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")


def clean_cell(value):
    value = value.strip()
    m = MD_LINK.search(value)
    if m:  # a link in a cell -> keep the URL
        value = m.group(2)
    value = re.sub(r"\\(.)", r"\1", value)  # Docs escapes e.g. https\://
    value = value.replace("**", "").strip()
    if value.startswith("(") and value.endswith(")"):  # template placeholder
        return ""
    return value


def parse_doc(markdown):
    """Return (fields, body, images) where images = {ref: (mime, bytes)}."""
    text = markdown.replace("\r\n", "\n")

    images = {}
    for ref, mime, b64 in IMG_REF_DEF.findall(text):
        images[ref] = (mime, base64.b64decode(re.sub(r"\s", "", b64)))
    text = IMG_REF_DEF.sub("", text)

    lines = text.split("\n")
    i = 0
    while i < len(lines) and not lines[i].strip():
        i += 1
    fields = {}
    while i < len(lines) and TABLE_ROW.match(lines[i]):
        cells = [c for c in TABLE_ROW.match(lines[i]).group(1).split("|")]
        if len(cells) >= 2:
            key = clean_cell(cells[0]).lower()
            if key and key != "field" and not set(key) <= set(":- "):
                fields[key] = clean_cell("|".join(cells[1:]))
        i += 1
    body = "\n".join(lines[i:])
    # Docs exports layout tabs at line starts; in Markdown those would become code blocks
    body = re.sub(r"(?m)^\t+", "", body)
    body = re.sub(r"(?m)^[ \t]+$", "", body)        # whitespace-only lines
    body = re.sub(r"(?m)^#{1,6}\s*$\n?", "", body)   # empty headings
    body = re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"
    return fields, body, images


def parse_date(value):
    for fmt in ("%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%d/%m/%Y", "%b %d, %Y", "%B %d, %Y"):
        try:
            return dt.datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            pass
    return None


def slugify(value):
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:80] or "untitled"


def yaml_str(value):
    return json.dumps(value, ensure_ascii=False)  # JSON strings are valid YAML scalars



# --------------------------------------------------------------------------- recovering "Wrap text" images
# Google's Markdown export silently drops images whose layout is "Wrap text" / "Break text" /
# "Behind/In front of text" (positioned images). The HTML export keeps them, so we use it to
# find the missing images and put each one just above the paragraph it is anchored to.
DATA_URI = re.compile(r"^data:(image/[a-z+]+);base64,(.+)$", re.S)


class _HtmlImages(html.parser.HTMLParser):
    """Collects (mime, bytes, paragraph_text) for every <img> in a Docs HTML export."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.images, self._para_imgs, self._text, self._in_p = [], [], [], False

    def handle_starttag(self, tag, attrs):
        if tag == "p":
            self._flush()
            self._in_p = True
        elif tag == "img":
            m = DATA_URI.match(dict(attrs).get("src", ""))
            if m:
                self._para_imgs.append((m.group(1), base64.b64decode(m.group(2))))

    def handle_endtag(self, tag):
        if tag == "p":
            self._flush()

    def handle_data(self, data):
        if self._in_p:
            self._text.append(data)

    def _flush(self):
        text = " ".join(self._text)
        for mime, data in self._para_imgs:
            self.images.append((mime, data, text))
        self._para_imgs, self._text, self._in_p = [], [], False

    def close(self):
        super().close()
        self._flush()


def _norm(text):
    text = MD_LINK.sub(r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\[[^\]]*\]|!\[[^\]]*\]\([^)]*\)|\[image\d+\]", " ", text)
    return re.sub(r"[^a-z0-9]+", "", re.sub(r"\\(.)", r"\1", text).lower())[:40]


def recover_positioned_images(body, images, html_text):
    """Return (body, images, recovered_count). Adds images missing from the Markdown export."""
    parser = _HtmlImages()
    parser.feed(html_text)
    parser.close()
    html_imgs = parser.images
    md_uses = IMG_USE.findall(body)
    if len(html_imgs) <= len(md_uses):
        return body, images, 0

    blocks = body.split("\n\n")
    block_norm = [_norm(b) for b in blocks]
    # context of each Markdown image = normalised text of its block
    md_ctx = []
    for _, ref in md_uses:
        idx = next((i for i, b in enumerate(blocks) if f"[{ref}]" in b), None)
        md_ctx.append(block_norm[idx] if idx is not None else "")

    missing, j = [], 0
    for mime, data, text in html_imgs:
        ctx = _norm(text)
        if j < len(md_ctx) and ctx[:25] == md_ctx[j][:25]:
            j += 1  # this image is already in the Markdown
        else:
            missing.append((mime, data, ctx))
    missing = missing[: len(html_imgs) - len(md_uses)]

    recovered, n = 0, 100
    for mime, data, ctx in missing:
        target = next((i for i, b in enumerate(block_norm) if ctx and b.startswith(ctx[:25])), None)
        n += 1
        ref = f"image{n}"
        images[ref] = (mime, data)
        line = f"![][{ref}]"
        if target is None:
            blocks.append(line)
            block_norm.append("")
        else:
            blocks.insert(target, line)
            block_norm.insert(target, "")
        recovered += 1
    return "\n\n".join(blocks), images, recovered

# --------------------------------------------------------------------------- conversion
def convert(doc, kind, drive, used_slugs):
    """Write one Doc as a Hugo page bundle. Returns (record, errors)."""
    md = drive.export_markdown(doc["id"])
    fields, body, images = parse_doc(md)
    errors, warnings = [], []
    try:
        body, images, recovered = recover_positioned_images(body, images, drive.export(doc["id"], "text/html"))
    except Exception as exc:  # recovery is best-effort
        recovered = 0
        print(f"[warn]  image recovery failed for {doc['name']}: {exc}")
    if recovered:
        warnings.append(
            f"{recovered} image(s) were set to \"Wrap text\" (or similar) and have been placed above the paragraph "
            "they were attached to. For exact placement, click the image and choose \"In line\" in the toolbar.")

    for key in REQUIRED_POST if kind == "post" else REQUIRED_PAGE:
        if not fields.get(key):
            errors.append(f'"{key.title()}" is missing in the table at the top.')

    pub_date = None
    if kind == "post" and fields.get("publish date"):
        pub_date = parse_date(fields["publish date"])
        if not pub_date:
            errors.append(f'"Publish date" must look like 2026-12-31 (found "{fields["publish date"]}").')
    category = fields.get("category", "News" if kind == "post" else "")
    if kind == "post" and category and category.lower() not in CATEGORIES:
        errors.append(f'"Category" must be one of News, Event, EDM, Member Spotlight (found "{category}").')
    summary = fields.get("short summary", "")
    if len(summary) > 160:
        errors.append(f'"Short summary" is {len(summary)} characters; please keep it to 160 or fewer.')
    for ref, (mime, data) in images.items():
        if mime not in ALLOWED_IMG:
            errors.append(f"Image {ref} has an unsupported type ({mime}). Use PNG, JPG, GIF or WebP.")
        if len(data) > MAX_IMG_BYTES:
            errors.append(f"Image {ref} is larger than 15 MB. Please use a smaller image.")
    if kind == "post" and not images:
        errors.append("No poster image found. Insert the poster as the first image in the Doc.")

    if errors:
        return None, errors

    base = slugify(fields["title"])
    slug, n = base, 2
    while slug in used_slugs:
        slug, n = f"{base}-{n}", n + 1
    used_slugs.add(slug)

    bundle = os.path.join(CONTENT, "posts" if kind == "post" else "", slug)
    os.makedirs(bundle, exist_ok=True)

    # Posts: the first image becomes the cover (shown at the top + social preview) and is
    # removed from the body. Pages: every image stays where it is in the Doc.
    uses = IMG_USE.findall(body)
    cover_ref = None
    if kind == "post":
        cover_ref = uses[0][1] if uses else (sorted(images)[0] if images else None)
    for ref, (mime, data) in images.items():
        name = ("cover" if ref == cover_ref else ref) + "." + ALLOWED_IMG[mime]
        with open(os.path.join(bundle, name), "wb") as f:
            f.write(data)

    def repl(m):
        alt, ref = m.group(1), m.group(2)
        if ref == cover_ref:
            return ""
        mime = images.get(ref, ("image/png",))[0]
        return f"![{alt}]({ref}.{ALLOWED_IMG.get(mime, 'png')})"

    body = IMG_USE.sub(repl, body).strip() + "\n"
    body = re.sub(r"[ \t]+\n", "\n", body)  # Docs adds trailing double spaces in lists

    fm = ["---", f"title: {yaml_str(fields['title'])}"]
    if kind == "post":
        fm += [f"date: {pub_date.isoformat()}", f"categories: [{yaml_str(category)}]"]
        if fields.get("event date"):
            fm.append(f"eventDate: {yaml_str(fields['event date'])}")
        if fields.get("sign-up link"):
            fm.append(f"signup: {yaml_str(fields['sign-up link'])}")
    else:
        order = fields.get("menu order", "")
        fm.append("menus: main")
        if order.isdigit():
            fm.append(f"weight: {int(order)}")
    if summary:
        fm.append(f"description: {yaml_str(summary)}")
    fm += [f"driveId: {yaml_str(doc['id'])}", "---", ""]

    with open(os.path.join(bundle, "index.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(fm) + body)

    url = f"{SITE_URL}{'posts/' if kind == 'post' else ''}{slug}/"
    digest = hashlib.sha256((CONVERTER_VERSION + md).encode()).hexdigest()
    record = {"name": doc["name"], "kind": kind, "slug": slug, "url": url,
              "hash": digest, "date": pub_date.isoformat() if pub_date else None}
    if warnings:
        record["warnings"] = warnings
    return record, []


def build():
    live = os.environ.get("LIVE_FOLDER_ID")
    if not live:
        sys.exit("LIVE_FOLDER_ID is not set")
    drive = Drive()

    subfolders = {f["name"].strip().lower(): f["id"] for f in drive.list_children(live) if f["mimeType"] == FOLDER_MIME}
    if "posts" not in subfolders:
        sys.exit('LIVE folder must contain a "Posts" folder')

    # Generated content is fully rebuilt: removing a Doc from LIVE removes the page.
    # The previous build is kept aside so a Doc with errors keeps its last good version.
    prev_content = os.path.join(ROOT, ".publish", "prev_content")
    shutil.rmtree(prev_content, ignore_errors=True)
    if os.path.isdir(CONTENT):
        shutil.move(CONTENT, prev_content)
    os.makedirs(os.path.join(CONTENT, "posts"), exist_ok=True)
    with open(os.path.join(CONTENT, "posts", "_index.md"), "w") as f:
        f.write('---\ntitle: "News & Events"\nmenus: main\nweight: 10\n---\n')

    state = {}
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            state = json.load(f)

    report = {"published": [], "errors": [], "removed": []}
    new_state, used = {}, set()
    for kind, folder in (("post", "posts"), ("page", "pages")):
        if folder not in subfolders:
            continue
        for doc in drive.list_children(subfolders[folder]):
            if doc["mimeType"] != DOC_MIME:
                continue
            prev = state.get(doc["id"], {})
            try:
                record, errors = convert(doc, kind, drive, used)
            except Exception as exc:  # keep going; one bad Doc must not block the site
                record, errors = None, [f"Unexpected error while converting: {exc}"]
            if errors:
                print(f"[error] {doc['name']}: {errors}")
                err_hash = hashlib.sha256((doc["modifiedTime"] + "".join(errors)).encode()).hexdigest()
                new_state[doc["id"]] = {**prev, "errorHash": err_hash, "name": doc["name"]}
                if prev.get("errorHash") != err_hash:  # comment once per change
                    report["errors"].append({"id": doc["id"], "name": doc["name"], "errors": errors})
                if prev.get("slug"):  # keep the last good version online
                    sub = "posts" if prev.get("kind") == "post" else ""
                    src = os.path.join(prev_content, sub, prev["slug"])
                    if os.path.isdir(src):
                        shutil.copytree(src, os.path.join(CONTENT, sub, prev["slug"]))
                        used.add(prev["slug"])
                continue
            print(f"[ok]    {doc['name']} -> {record['url']}")
            new_state[doc["id"]] = record
            if prev.get("hash") != record["hash"] or prev.get("url") != record["url"]:
                report["published"].append({"id": doc["id"], **record})

    for doc_id, prev in state.items():
        if doc_id not in new_state and prev.get("url"):
            report["removed"].append({"id": doc_id, **prev})
            print(f"[gone]  {prev.get('name')} (removed from LIVE)")

    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(new_state, f, indent=1, sort_keys=True)
    os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)
    with open(REPORT_FILE, "w") as f:
        json.dump(report, f, indent=1)

    changed = bool(report["published"] or report["removed"])
    print(f"published/changed={len(report['published'])} removed={len(report['removed'])} errors={len(report['errors'])}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write(f"changed={'true' if changed else 'false'}\n")


def comment():
    if not os.path.exists(REPORT_FILE):
        print("no report; nothing to comment")
        return
    with open(REPORT_FILE) as f:
        report = json.load(f)
    drive = Drive()
    today = dt.date.today().isoformat()
    for item in report.get("published", []):
        if item.get("date") and item["date"] > today:
            msg = f"Scheduled: this post will appear on {item['date']} at {item['url']}"
        else:
            msg = f"Published on the website: {item['url']}"
        if item.get("warnings"):
            msg += "\n\nPlease note:\n- " + "\n- ".join(item["warnings"])
        _safe_comment(drive, item["id"], msg)
    for item in report.get("errors", []):
        msg = "Could not publish this Doc. Please fix the following, and the next run will try again:\n- " + "\n- ".join(item["errors"])
        _safe_comment(drive, item["id"], msg)


def _safe_comment(drive, file_id, text):
    try:
        drive.add_comment(file_id, text)
        print(f"[comment] {file_id}: {text.splitlines()[0]}")
    except Exception as exc:  # commenting is best-effort
        print(f"[comment-failed] {file_id}: {exc}")


if __name__ == "__main__":
    {"build": build, "comment": comment}[(sys.argv[1:] or ["build"])[0]]()
