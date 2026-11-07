"""Generate the quiz voice clips with Google Translate's Vietnamese voice.

Run after editing questions in a page:  python3 gen_audio.py
"""
import os, re, ssl, urllib.parse, urllib.request

# python.org builds on macOS ship without CA certs; fall back to the system bundle.
CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem" if os.path.exists("/etc/ssl/cert.pem") else None)
ROOT = os.path.dirname(os.path.abspath(__file__))

# page -> (audioDir, readOptions); keep in sync with window.GAME in each page
PAGES = {"index.html": ("audio", False)}

texts = {}
for page, (folder, read_options) in PAGES.items():
    html = open(os.path.join(ROOT, page), encoding="utf-8").read()
    rows = re.findall(r'q: "([^"]+)",\s*options: \[([^\]]+)\]', html)
    assert len(rows) == 10, f"{page}: expected 10 questions, found {len(rows)}"
    for i, (q, opts) in enumerate(rows, 1):
        # keep in sync with questionText() in quiz.js
        options = re.findall(r'"([^"]+)"', opts)
        texts[f"{folder}/q{i}"] = f"{q} {', '.join(options)}" if read_options else q

# keep in sync with resultMessage() in quiz.js
for s in range(11):
    msg = ("Tuyệt vời! Bé trả lời đúng hết rồi!" if s == 10 else
           "Bé làm tốt lắm! Chơi lại để được 10 điểm nhé!" if s >= 6 else
           "Cố lên nào! Mình cùng chơi lại nhé!")
    texts[f"audio/r{s}"] = f"Bé được {s} điểm. {msg}"

for path, text in texts.items():
    assert len(text) <= 200, f"{path}: Google TTS limit is 200 chars"
    url = "https://translate.google.com/translate_tts?" + urllib.parse.urlencode(
        {"ie": "UTF-8", "tl": "vi", "client": "tw-ob", "q": text})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
        assert r.headers.get_content_type() == "audio/mpeg", f"{path}: got {r.headers.get_content_type()}"
        data = r.read()
    os.makedirs(os.path.join(ROOT, os.path.dirname(path)), exist_ok=True)
    open(os.path.join(ROOT, f"{path}.mp3"), "wb").write(data)
    print(f"{path} {len(data):>6}B  {text}")
