import subprocess, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 1080, 1920, 30
DUR = 43.4
NF = int(DUR * FPS)

BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
XBOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
YEL = (255, 201, 40)
INK = (14, 14, 14)

HOOK_END = 6.567          # original burned-in text disappears here
PHRASES = [7.3, 9.5, 14.7, 17.0, 21.0, 22.2, 23.8, 27.0, 29.5, 32.4, 36.6, 38.6, 40.0, 42.5]
ZOOMS = [1.10, 1.03, 1.14, 1.06]
CTA_START = 40.0

def font(path, size): return ImageFont.truetype(path, size)

def text_sprite(txt, f, fill, stroke=0, stroke_fill=None, tracking=0):
    # render text with optional letter spacing onto a tight RGBA sprite
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    widths = [tmp.textlength(c, font=f) + tracking for c in txt]
    asc, desc = f.getmetrics()
    w = int(sum(widths) - tracking + 2 * stroke + 4)
    h = asc + desc + 2 * stroke + 4
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = stroke + 2
    for c, cw in zip(txt, widths):
        d.text((x, stroke + 2), c, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
        x += cw
    return img.crop(img.getbbox())

def rounded(w, h, r, fill):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=fill)
    return img

def shadowed(img, blur=18, off=(0, 10), alpha=150, pad=40):
    w, h = img.size
    out = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, (0, 0, 0, 0))
    a = img.split()[3].point(lambda v: v * alpha // 255)
    sh.paste((0, 0, 0, 255), (pad + off[0], pad + off[1]), a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    out = Image.alpha_composite(sh, out)
    out.alpha_composite(img, (pad, pad))
    return out

def ease_out(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def back_out(x, s=1.7):
    x = min(max(x, 0), 1) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2

def place(frame, spr, cx, cy, scale=1.0, alpha=1.0):
    if alpha <= 0.01 or scale <= 0.01: return
    if abs(scale - 1) > 1e-3:
        spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BICUBIC)
    if alpha < 0.999:
        spr = spr.copy(); spr.putalpha(spr.split()[3].point(lambda v: int(v * alpha)))
    frame.alpha_composite(spr, (int(cx - spr.width / 2), int(cy - spr.height / 2)))

# ---------- hook card (covers original box: x 105-990, y 1230-1560 at 1080p) ----------
CARD_W, CARD_H = 980, 470
CARD_CX, CARD_CY = 540, 1400
card = shadowed(rounded(CARD_W, CARD_H, 44, INK + (255,)))
accent = rounded(140, 12, 6, YEL + (255,))
l1 = text_sprite("EU FATURO", font(XBOLD, 56), (255, 255, 255), tracking=8)
money = {v: text_sprite(f"R$ {v} MIL", font(BLACK, 150), YEL) for v in range(0, 41)}
l3 = text_sprite("POR MÊS VENDENDO", font(XBOLD, 60), (255, 255, 255))
farinha = text_sprite("FARINHA", font(BLACK, 60), INK)
farinha_bg = rounded(farinha.width + 36, farinha.height + 26, 14, YEL + (255,))
farinha_pill = farinha_bg.copy(); farinha_pill.alpha_composite(farinha, (18, 13))
net = text_sprite("NA INTERNET", font(XBOLD, 60), (255, 255, 255))

def draw_hook(fr, t):
    if t > HOOK_END + 0.35: return
    out = ease_out((t - HOOK_END) / 0.3) if t > HOOK_END else 0
    k, a = 1 - 0.25 * out, 1 - out
    # card must fully cover the original text until HOOK_END, so it is static at t=0
    place(fr, card, CARD_CX, CARD_CY, k, a)
    def rel(x, y): return CARD_CX + (x - CARD_CX) * k, CARD_CY + (y - CARD_CY) * k
    def item(spr, x, y, t0, dy=40):
        p = ease_out((t - t0) / 0.35)
        cx, cy = rel(x, y + dy * (1 - p))
        place(fr, spr, cx, cy, k, a * p)
    # first frame doubles as the thumbnail, so the headline is already on screen at t=0
    item(accent, 540, 1205, -1, 0)
    item(l1, 540, 1250, -1)
    v = int(round(40 * ease_out(t / 0.9)))
    pop = 1 + 0.12 * math.sin(min(max((t - 0.9) / 0.3, 0), 1) * math.pi)
    p = 1.0
    cx, cy = rel(540, 1365)
    place(fr, money[v], cx, cy, k * pop * (0.7 + 0.3 * p), a * p)
    item(l3, 540, 1480, 0.9)
    # "FARINHA" pill pops in, then the rest of the line
    gap = 18
    total = farinha_pill.width + gap + net.width
    x0 = 540 - total / 2
    pp = back_out((t - 1.15) / 0.4)
    cx, cy = rel(x0 + farinha_pill.width / 2, 1565)
    place(fr, farinha_pill, cx, cy, k * max(pp, 0), a * min(1, max(0, (t - 1.15) / 0.15)))
    item(net, x0 + farinha_pill.width + gap + net.width / 2, 1565, 1.3, 0)

# ---------- follow CTA ----------
cta_txt = text_sprite("SEGUIR", font(BLACK, 66), INK)
plus = Image.new("RGBA", (56, 56), (0, 0, 0, 0))
pd = ImageDraw.Draw(plus); pd.rounded_rectangle((22, 0, 34, 55), 6, fill=INK); pd.rounded_rectangle((0, 22, 55, 34), 6, fill=INK)
pill = rounded(cta_txt.width + plus.width + 130, 132, 66, (255, 255, 255, 255))
pill.alpha_composite(plus, (52, 38)); pill.alpha_composite(cta_txt, (52 + 56 + 26, (132 - cta_txt.height) // 2))
pill = shadowed(pill)
cta_top = shadowed(text_sprite("CURTIU? ENTÃO", font(XBOLD, 54), (255, 255, 255), stroke=6, stroke_fill=INK), blur=10, off=(0, 4))

def draw_cta(fr, t):
    if t < CTA_START: return
    p = back_out((t - CTA_START - 0.15) / 0.5)
    pulse = 1 + 0.05 * math.sin((t - CTA_START) * 2 * math.pi * 1.4) * (t > CTA_START + 0.8)
    q = ease_out((t - CTA_START) / 0.35)
    place(fr, cta_top, 540, 1290 + 30 * (1 - q), 1, q)
    place(fr, pill, 540, 1420, max(p, 0) * pulse, min(1, (t - CTA_START) / 0.2))

# ---------- progress bar ----------
def draw_progress(fr, t):
    d = ImageDraw.Draw(fr)
    d.rectangle((0, 0, W, 10), fill=(0, 0, 0, 90))
    d.rectangle((0, 0, int(W * t / DUR), 10), fill=YEL + (255,))

def zoom_at(t):
    if t < PHRASES[0]: return 1.0
    i = max(j for j, s in enumerate(PHRASES) if s <= t)
    end = PHRASES[i + 1] if i + 1 < len(PHRASES) else DUR
    prog = (t - PHRASES[i]) / (end - PHRASES[i])
    return ZOOMS[i % len(ZOOMS)] + 0.025 * prog   # slow push within each phrase

dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-t", str(DUR), "-vf",
    "scale=1080:1920:flags=lanczos,eq=contrast=1.07:saturation=1.18:gamma=0.97,"
    "colorbalance=rm=0.03:bm=-0.04:rh=0.02:bh=-0.02,unsharp=5:5:0.55,vignette=angle=PI/7",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
    "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", SRC, "-map", "0:v", "-map", "1:a",
    "-af", "highpass=f=80,loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", "48000",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", OUT], stdin=subprocess.PIPE)

fs = W * H * 3
n = 0
while True:
    buf = dec.stdout.read(fs)
    if len(buf) < fs: break
    t = n / FPS
    img = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1)
    z = zoom_at(t)
    if z > 1.0005:
        cw, ch = W / z, H / z
        x0, y0 = (W - cw) * 0.5, (H - ch) * 0.25   # keep the face (upper third) in frame
        img = img.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
    fr = img.convert("RGBA")
    draw_hook(fr, 2.0 if n == 0 else t)   # frame 0 is the auto-thumbnail: show the finished headline
    draw_cta(fr, t)
    draw_progress(fr, t)
    enc.stdin.write(fr.convert("RGB").tobytes())
    n += 1
    if n % 150 == 0: print(f"{t:.1f}s", flush=True)
enc.stdin.close(); enc.wait(); dec.wait()
print("frames", n, "rc", enc.returncode)
