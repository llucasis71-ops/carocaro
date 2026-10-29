"""v3 motion design: Anton/Montserrat typography, per-letter reveals, blur-ins, box wipes,
official brand icons + line-icon badges with ring bursts, text behind the speaker
(person mask), zoom-blur transitions, money drop synced to the music, SFX + music mix."""
import subprocess, sys, math, json, re, random, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT, WORDS_JSON, MASKS, ICONS, FONTS, SOUNDS, MUSIC, TMP = sys.argv[1:10]
W, H, FPS, SR = 1080, 1920, 30, 48000
DUR = 43.4
random.seed(11)

ANTON = f"{FONTS}/fontsource-anton-5.3.0/package/files/anton-latin-400-normal.woff"
MB = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-900-normal.woff"
MBI = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-900-italic.woff"
M8 = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-800-normal.woff"
M7 = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-700-normal.woff"
ACC, INK, WHITE = (217, 12, 21), (17, 17, 17), (255, 255, 255)   # ACC = red from the brand logo
MAROON_TOP, MAROON_BOT = (96, 32, 23), (40, 22, 18)
RED, GREEN = (240, 68, 68), (34, 197, 94)

HOOK_END = 6.567
PHRASES = [7.28, 9.48, 14.70, 17.00, 21.06, 22.14, 23.76, 25.10, 26.96, 29.50, 32.42, 35.03, 36.64, 38.62, 39.88, 42.48]
ZOOMS = [1.10, 1.03, 1.14, 1.06]
PUNCH = {23.76: 1.0, 25.10: 1.20}
TRANSITIONS = [9.48, 17.00, 21.06, 29.50, 35.03, 39.88]
WORDS = json.load(open(WORDS_JSON))
MASK = np.load(MASKS)

_fonts = {}
def font(path, size):
    if (path, size) not in _fonts: _fonts[(path, size)] = ImageFont.truetype(path, size)
    return _fonts[(path, size)]

# ---------------- sprite helpers ----------------
def text_sprite(txt, f, fill, stroke=0, stroke_fill=None, tracking=0):
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    asc, desc = f.getmetrics()
    if tracking == 0:
        w = int(tmp.textlength(txt, font=f) + 2 * stroke + 8)
        img = Image.new("RGBA", (max(w, 1), asc + desc + 2 * stroke + 8), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((stroke + 4, stroke + 4), txt, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
    else:
        widths = [tmp.textlength(c, font=f) + tracking for c in txt]
        img = Image.new("RGBA", (int(sum(widths) + 2 * stroke + 8), asc + desc + 2 * stroke + 8), (0, 0, 0, 0))
        d = ImageDraw.Draw(img); x = stroke + 4
        for c, cw in zip(txt, widths):
            d.text((x, stroke + 4), c, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill); x += cw
    bb = img.getbbox()
    return img.crop(bb) if bb else img

def rounded(w, h, r, fill):
    img = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, int(w) - 1, int(h) - 1), r, fill=fill)
    return img

def shadowed(img, blur=16, off=(0, 8), alpha=140, pad=36, color=(0, 0, 0)):
    w, h = img.size
    out = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, color + (0,))
    sh.paste(color + (255,), (pad + off[0], pad + off[1]), img.split()[3].point(lambda v: v * alpha // 255))
    out = Image.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)), out)
    out.alpha_composite(img, (pad, pad))
    return out

def scaled(spr, k):
    return spr.resize((max(1, int(spr.width * k)), max(1, int(spr.height * k))), Image.LANCZOS)

def fitw(spr, maxw): return scaled(spr, maxw / spr.width) if spr.width > maxw else spr

def icon(name, size):
    return shadowed(Image.open(f"{ICONS}/{name}.png").convert("RGBA").resize((size, size), Image.LANCZOS), blur=14, off=(0, 10), alpha=120, pad=30)

def ease_out(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def ease_in(x): x = min(max(x, 0), 1); return x ** 3
def ease_io(x): x = min(max(x, 0), 1); return 3 * x * x - 2 * x ** 3
def back_out(x, s=1.7):
    x = min(max(x, 0), 1) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2
def elastic(x):
    x = min(max(x, 0), 1)
    return 1 if x == 1 else 2 ** (-10 * x) * math.sin((x * 10 - 0.75) * 2 * math.pi / 3) + 1

def with_alpha(spr, a):
    if a >= 0.999: return spr
    spr = spr.copy(); spr.putalpha(spr.split()[3].point(lambda v: int(v * a))); return spr

def place(frame, spr, cx, cy, scale=1.0, alpha=1.0, rot=0.0, blur=0.0):
    if alpha <= 0.01 or scale <= 0.01: return
    if abs(scale - 1) > 1e-3: spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BICUBIC)
    if abs(rot) > 0.1: spr = spr.rotate(rot, resample=Image.BICUBIC, expand=True)
    if blur > 0.4:
        p = int(blur * 2.5)
        big = Image.new("RGBA", (spr.width + 2 * p, spr.height + 2 * p), (0, 0, 0, 0)); big.paste(spr, (p, p))
        spr = big.filter(ImageFilter.GaussianBlur(blur))
    spr = with_alpha(spr, alpha)
    x, y = int(cx - spr.width / 2), int(cy - spr.height / 2)
    sx, sy = max(0, -x), max(0, -y)
    if sx >= spr.width or sy >= spr.height or x >= W or y >= H: return
    if sx or sy: spr = spr.crop((sx, sy, spr.width, spr.height))
    frame.alpha_composite(spr, (max(0, x), max(0, y)))

def env(t, t0, t1, fin=0.3, fout=0.25):
    if t < t0 or t > t1 + fout: return None
    return min(1, (t - t0) / fin), (min(1, (t - t1) / fout) if t > t1 else 0.0)

BEHIND, FRONT, SFX = [], [], []
def sfx(kind, t, gain=1.0): SFX.append((kind, t, gain))

# ---------------- type styles ----------------
def anton(txt, size, style="ink", maxw=1040, track=0, stretch=1.0, maxh=None):
    f = font(ANTON, size)
    if style == "ink": spr = text_sprite(txt, f, INK, tracking=track)
    elif style == "red": spr = text_sprite(txt, f, ACC, stroke=max(5, size // 40), stroke_fill=INK, tracking=track)
    elif style == "white": spr = text_sprite(txt, f, WHITE, stroke=max(4, size // 50), stroke_fill=INK, tracking=track)
    elif style == "outline": spr = text_sprite(txt, f, (0, 0, 0, 0), stroke=max(4, size // 45), stroke_fill=INK, tracking=track)
    if stretch != 1.0: spr = spr.resize((spr.width, int(spr.height * stretch)), Image.LANCZOS)
    spr = fitw(shadowed(spr, blur=18, off=(0, 12), alpha=90, pad=30), maxw)
    if maxh and spr.height > maxh: spr = scaled(spr, maxh / spr.height)
    return spr

def tall(txt, style="ink", maxh=640, maxw=1040, stretch=1.75):
    """extra-tall condensed lettering for the words behind the speaker"""
    return anton(txt, 300, style, maxw=maxw, stretch=stretch, maxh=maxh)

def top(spr, y0=50): return y0 + spr.height / 2

def mont(txt, size, fill=WHITE, italic=False, maxw=1000, shadow=True, track=0):
    spr = text_sprite(txt, font(MBI if italic else MB, size), fill, tracking=track)
    return fitw(shadowed(spr, blur=12, off=(0, 6), alpha=170, pad=24) if shadow else spr, maxw)

# ---------------- animation primitives ----------------
def blur_in(layer, spr, t0, t1, x, y, k0=1.3, sound="whoosh", drift=0.03):
    """scale-down + defocus entrance, slow push while held, blur-out exit"""
    if sound: sfx(sound, t0 - 0.12)
    def draw(fr, t):
        e = env(t, t0, t1, 0.32, 0.25)
        if not e: return
        p, q = e; pe = ease_out(p)
        k = (k0 + (1 - k0) * pe) * (1 + drift * (t - t0)) * (1 + 0.15 * ease_in(q))
        place(fr, spr, x, y, k, pe * (1 - q), blur=10 * (1 - pe) + 12 * q)
    layer.append(draw)

def char_reveal(layer, txt, f, fill, t0, t1, x, y, stagger=0.035, sound="snap", stroke=0, stroke_fill=None, maxw=1000):
    """letters rise one by one from behind a baseline mask, overshoot, then exit upward"""
    if sound: sfx(sound, t0)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    k = min(1, maxw / (tmp.textlength(txt, font=f) + 2 * stroke))
    if k < 1: f = font(f.path, int(f.size * k))
    full = text_sprite(txt, f, fill, stroke=stroke, stroke_fill=stroke_fill)
    asc, desc = f.getmetrics()
    xs = [tmp.textlength(txt[:i], font=f) for i in range(len(txt) + 1)]
    chars = []
    for i, c in enumerate(txt):
        if c == " ": continue
        cs = text_sprite(c, f, fill, stroke=stroke, stroke_fill=stroke_fill)
        cx = (xs[i] + xs[i + 1]) / 2 - xs[-1] / 2
        chars.append((cs, cx, i))
    h = full.height
    def draw(fr, t):
        e = env(t, t0, t1, 0.5 + stagger * len(txt), 0.3)
        if not e: return
        for cs, cx, i in chars:
            p = back_out((t - t0 - i * stagger) / 0.32, 1.3)
            q = ease_in((t - t1 - i * stagger * 0.5) / 0.25) if t > t1 else 0
            if p <= 0 or q >= 1: continue
            dy = cs.height * 1.1 * (1 - p) - cs.height * 1.1 * q
            visible = cs.height - max(0, dy) if q == 0 else cs.height - max(0, -dy)
            if visible <= 1: continue
            if q == 0:
                part = cs.crop((0, 0, cs.width, int(min(cs.height, visible))))
                place(fr, part, x + cx, y - cs.height / 2 + dy + part.height / 2, 1, min(1, p * 2))
            else:
                part = cs.crop((0, int(cs.height - visible), cs.width, cs.height))
                place(fr, part, x + cx, y + cs.height / 2 + dy - part.height / 2, 1, 1 - q)
    layer.append(draw)

def box_wipe(layer, txt, f, box_col, txt_col, t0, t1, x, y, sound="snap", padx=34, pady=18, maxw=1000):
    if sound: sfx(sound, t0)
    tx = text_sprite(txt, f, txt_col)
    if tx.width + 2 * padx > maxw: tx = scaled(tx, (maxw - 2 * padx) / tx.width)
    bw, bh = tx.width + 2 * padx, tx.height + 2 * pady
    full = rounded(bw, bh, 14, box_col + (255,)); full.alpha_composite(tx, (padx, pady))
    full = shadowed(full, blur=14, off=(0, 10), alpha=130, pad=30)
    def draw(fr, t):
        e = env(t, t0, t1, 0.28, 0.22)
        if not e: return
        p, q = ease_io(e[0]), ease_io(e[1])
        x0, x1 = int(full.width * q), int(full.width * p)
        if x1 - x0 < 2: return
        part = full.crop((x0, 0, x1, full.height))
        k = 1 + 0.04 * math.sin(min(1, (t - t0) / 0.35) * math.pi)
        place(fr, part, x - full.width / 2 + x0 + part.width / 2, y, k)
    layer.append(draw)

def marquee(layer, spr, t0, t1, y, speed=-520, sound="whoosh"):
    if sound: sfx(sound, t0 - 0.1)
    period = spr.width + 40
    def draw(fr, t):
        e = env(t, t0, t1, 0.25, 0.25)
        if not e: return
        p, q = e
        x = -period + ((t - t0) * speed) % period
        while x < W + period:
            place(fr, spr, x + spr.width / 2, y, 1, ease_out(p) * (1 - q)); x += period
    layer.append(draw)

def ring(fr, x, y, r0, t, color=WHITE, width=7):
    """expanding ring + 8 spark lines, t in 0..1"""
    if not (0 <= t < 1): return
    a = int(255 * (1 - t) ** 1.5); r = r0 * (0.7 + 0.9 * ease_out(t))
    R = int(r0 * 2.4) + 10; patch = Image.new("RGBA", (2 * R, 2 * R), (0, 0, 0, 0)); d = ImageDraw.Draw(patch)
    d.ellipse((R - r, R - r, R + r, R + r), outline=color + (a,), width=max(2, int(width * (1 - t) + 1)))
    for k in range(8):
        ang = k * math.pi / 4 + 0.39
        r1, r2 = r0 * (1.0 + 0.8 * ease_out(t)), r0 * (1.2 + 1.1 * ease_out(t))
        d.line((R + r1 * math.cos(ang), R + r1 * math.sin(ang), R + r2 * math.cos(ang), R + r2 * math.sin(ang)),
               fill=ACC + (a,), width=6)
    place(fr, patch, x, y)

def icon_pop(layer, spr, t0, t1, x, y, sound="pop", bob=10, tilt=-14, burst=True):
    if sound: sfx(sound, t0)
    ph = random.random() * 6
    def draw(fr, t):
        e = env(t, t0, t1, 0.6, 0.22)
        if not e: return
        p, q = e
        if burst: ring(fr, x, y, spr.width * 0.36, (t - t0) / 0.45)
        k = elastic((t - t0) / 0.7) * (1 - ease_in(q))
        rot = tilt * (1 - ease_out((t - t0) / 0.5)) + 3 * math.sin((t - t0) * 2.1 + ph)
        place(fr, spr, x, y + bob * math.sin((t - t0) * 2.7 + ph), max(0, k), 1 - q, rot, blur=8 * q)
    layer.append(draw)

def with_badge(base, mini, frac=0.42):
    m = scaled(mini, base.width * frac / mini.width)
    img = Image.new("RGBA", base.size, (0, 0, 0, 0)); img.alpha_composite(base)
    img.alpha_composite(m, (base.width - m.width - 8, base.height - m.height - 8)); return img

def flash(t0, dur=0.3, strength=0.85):
    def draw(fr, t):
        if t0 <= t < t0 + dur:
            fr.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(255 * strength * (1 - (t - t0) / dur) ** 2))))
    FRONT.append(draw)

SHAKES = []
def shake(t0, dur=0.5, amp=24): SHAKES.append((t0, dur, amp))
def shake_offset(t):
    dx = dy = 0.0
    for t0, dur, amp in SHAKES:
        if t0 <= t < t0 + dur:
            k = amp * (1 - (t - t0) / dur) ** 2; dx += k * math.sin(t * 97); dy += k * math.cos(t * 71)
    return dx, dy

DARKEN = []     # (t0, t1, peak) dims the plate before a reveal
def darken_at(t):
    a = 0.0
    for t0, t1, pk in DARKEN:
        if t0 <= t < t1: a = max(a, pk * ease_in((t - t0) / (t1 - t0)))
    return a

# ================= TIMELINE =================
IG, WA = icon("instagram", 200), icon("whatsapp", 200)
LOGO = Image.open(f"{ICONS}/../logo/logo.png").convert("RGBA")
IGs, WAs = icon("instagram", 160), icon("whatsapp", 160)

# hook: question badge on "O que nós vendemos aqui?"
icon_pop(FRONT, icon("question", 170), 3.9, 5.2, 890, 640)
TX = tall("COMMODITY"); blur_in(BEHIND, TX, 6.0, 6.95, 540, top(TX))

# farinha de mandioca
TX = tall("FARINHA DE MANDIOCA  —  ", "red", maxw=99999); marquee(BEHIND, TX, 7.15, 9.15, top(TX), speed=-950)
box_wipe(FRONT, "100% MANDIOCA", font(ANTON, 104), ACC, WHITE, 7.9, 9.05, 540, 1330)
icon_pop(FRONT, icon("wheat", 170), 7.35, 9.05, 150, 1010)
icon_pop(FRONT, icon("package", 170), 7.6, 9.05, 930, 1010, tilt=14, sound=None)

# apenas instagram e whatsapp
TX = tall("APENAS"); blur_in(BEHIND, TX, 10.1, 11.65, 540, top(TX))
icon_pop(FRONT, IG, 10.62, 13.0, 190, 830)
icon_pop(FRONT, WA, 11.28, 13.0, 890, 830, tilt=14)
char_reveal(FRONT, "PRO", font(MB, 64), WHITE, 11.95, 14.35, 540, 1150, sound=None)
char_reveal(FRONT, "CONSUMIDOR", font(ANTON, 150), WHITE, 12.6, 14.35, 540, 1265, stroke=4, stroke_fill=INK)
box_wipe(FRONT, "FINAL", font(ANTON, 170), ACC, WHITE, 13.95, 14.35, 540, 1440)
icon_pop(FRONT, icon("cart", 150), 13.15, 14.35, 905, 1110, tilt=14)

# não é atacado, é varejo
char_reveal(FRONT, "ATACADO", font(ANTON, 170), WHITE, 15.05, 16.6, 540, 1210, stroke=4, stroke_fill=INK)
def draw_strike(fr, t, t0=15.55, t1=16.6):
    e = env(t, t0, t1, 0.2, 0.25)
    if not e: return
    s = ease_out(e[0]); patch = Image.new("RGBA", (540, 80), (0, 0, 0, 0))
    ImageDraw.Draw(patch).line((20, 50, 20 + 480 * s, 30), fill=RED + (255,), width=22)
    place(fr, patch, 300 - 20 + 270, 1175 + 40, 1, 1 - e[1])
FRONT.append(draw_strike); sfx("swish", 15.5)
icon_pop(FRONT, icon("x", 120), 15.62, 16.6, 900, 1120, sound=None)
box_wipe(FRONT, "VAREJO", font(ANTON, 210), ACC, WHITE, 15.9, 16.6, 540, 1420, sound="impact")
icon_pop(FRONT, icon("check", 130), 16.05, 16.6, 900, 1330, sound="pop")

# sem loja, sem rua
TX = tall("SEM LOJA"); blur_in(BEHIND, TX, 17.0, 18.6, 540, top(TX))
icon_pop(FRONT, with_badge(icon("store", 200), icon("x", 120)), 17.85, 18.65, 175, 790)
TX = tall("SEM RUA", "red"); blur_in(BEHIND, TX, 18.7, 20.75, 540, top(TX))
icon_pop(FRONT, with_badge(icon("users", 200), icon("x", 120)), 19.5, 20.75, 905, 790, tilt=14)

# só instagram + whatsapp
TX = tall("SÓ", "red", maxh=900, stretch=1.6); blur_in(BEHIND, TX, 21.0, 22.1, 290, top(TX), k0=1.6, sound="impact")
icon_pop(FRONT, IG, 22.12, 23.6, 330, 1240)
char_reveal(FRONT, "+", font(MB, 150), WHITE, 22.7, 23.6, 540, 1240, sound=None)
icon_pop(FRONT, WA, 23.02, 23.6, 750, 1240, tilt=14)

# ---------- WOW: R$ 40.000 por mês (music drops here) ----------
COUNT_T0, COUNT_T1, MONEY_END = 25.10, 25.95, 29.3
DARKEN.append((23.9, 25.1, 0.45))
char_reveal(FRONT, "VENDE MAIS DE", font(MB, 84), WHITE, 24.2, 25.05, 540, 1240, stagger=0.03)
flash(COUNT_T0); shake(COUNT_T0); sfx("shutter", COUNT_T0 - 0.02); sfx("cash", COUNT_T1); sfx("coins", COUNT_T1 + 0.05)
glow = Image.new("RGBA", (1000, 520), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((100, 90, 900, 430), fill=(255, 60, 50, 140)); glow = glow.filter(ImageFilter.GaussianBlur(70))
_cc = {}
def draw_counter(fr, t):
    e = env(t, COUNT_T0, MONEY_END, 0.15, 0.3)
    if not e: return
    p, q = e
    v = int(round(40 * ease_out((t - COUNT_T0) / (COUNT_T1 - COUNT_T0))))
    key = f"R$ {v}.000" if v else "R$ 0"
    if key not in _cc:
        cs = text_sprite(key, font(ANTON, 330), ACC, stroke=9, stroke_fill=INK)
        cs = cs.resize((cs.width, int(cs.height * 1.7)), Image.LANCZOS)
        _cc[key] = fitw(shadowed(cs, blur=20, off=(0, 12), alpha=110, pad=30), 1060)
    pulse = 1 + 0.08 * math.sin(min(max((t - COUNT_T1) / 0.25, 0), 1) * math.pi)
    place(fr, glow, 540, 330, 1.2 + 0.05 * math.sin(t * 6), 0.85 * (1 - q))
    place(fr, _cc[key], 540, 50 + _cc[key].height / 2, (0.75 + 0.25 * ease_out(p)) * pulse * (1 + 0.02 * (t - COUNT_T0)), 1 - q, blur=12 * q)
BEHIND.append(draw_counter)
box_wipe(FRONT, "POR MÊS", font(ANTON, 190), WHITE, INK, 26.9, MONEY_END, 540, 1250, sound="impact")
icon_pop(FRONT, icon("coins", 160), 27.1, 29.2, 150, 1060)
icon_pop(FRONT, icon("trending", 160), 27.35, 29.2, 930, 1060, tilt=14, sound=None)

def bill(w=170):
    h = int(w * 0.48); img = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 10, fill=(34, 160, 90, 255))
    d.rounded_rectangle((7, 7, w - 8, h - 8), 7, outline=(140, 230, 170, 255), width=3)
    r = h * 0.3; d.ellipse((w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r), fill=(220, 250, 228, 255))
    s = text_sprite("$", font(MB, int(h * 0.42)), (34, 160, 90)); img.alpha_composite(s, (int(w / 2 - s.width / 2), int(h / 2 - s.height / 2)))
    return shadowed(img, blur=8, off=(0, 6), alpha=110, pad=16)
BILLS = [bill(w) for w in (130, 160, 190)]
PARTS = []
for i in range(30):
    PARTS.append(dict(spr=random.choice(BILLS), t0=COUNT_T1 + random.uniform(0, 0.2), x=540 + random.uniform(-160, 160), y=780,
                      vx=random.uniform(-900, 900), vy=random.uniform(-1050, -450), rot=random.uniform(-40, 40),
                      vr=random.uniform(-300, 300), flip=random.uniform(4, 10), g=2300))
for i in range(20):
    PARTS.append(dict(spr=random.choice(BILLS), t0=26.3 + random.uniform(0, 2.4), x=random.uniform(40, 1040), y=-100,
                      vx=random.uniform(-80, 80), vy=random.uniform(260, 460), rot=random.uniform(-40, 40),
                      vr=random.uniform(-90, 90), flip=random.uniform(2, 5), g=60))
def draw_money(fr, t):
    if not (COUNT_T1 <= t <= MONEY_END + 0.6): return
    fade = 1 - ease_out((t - MONEY_END) / 0.5) if t > MONEY_END else 1
    for pt in PARTS:
        dt = t - pt["t0"]
        if dt < 0: continue
        x = pt["x"] + pt["vx"] * dt; y = pt["y"] + pt["vy"] * dt + 0.5 * pt["g"] * dt * dt
        if y > H + 150: continue
        spr = pt["spr"]; fx = abs(math.cos(dt * pt["flip"]))
        spr = spr.resize((max(2, int(spr.width * (0.25 + 0.75 * fx))), spr.height), Image.BILINEAR)
        place(fr, spr, x, y, 1, fade, pt["rot"] + pt["vr"] * dt)
FRONT.append(draw_money)

# tradicional / casas / norte
TX = tall("TRADICIONAL"); blur_in(BEHIND, TX, 30.1, 31.95, 540, top(TX))
for i, (x, t0) in enumerate([(270, 31.1), (540, 31.24), (810, 31.38)]):
    icon_pop(FRONT, icon("house", 150), t0, 31.95, x, 1290, sound="pop" if i == 0 else "tick", tilt=0)

# o pulo do gato
char_reveal(FRONT, "O PULO", font(ANTON, 140), WHITE, 32.55, 34.0, 540, 1220, stroke=4, stroke_fill=INK)
box_wipe(FRONT, "DO GATO", font(ANTON, 200), ACC, WHITE, 33.15, 34.0, 540, 1400, sound="impact")
CAT = icon("cat", 190)
def draw_cat(fr, t, t0=32.7, t1=33.9):
    if not (t0 <= t <= t1 + 0.25): return
    u = min(1, (t - t0) / (t1 - t0))
    path = lambda uu: (1000 - 920 * uu, 860 - 640 * math.sin(math.pi * uu))
    for k in range(5, 0, -1):
        uu = max(0, u - k * 0.03); x, y = path(uu)
        place(fr, CAT, x, y, 0.92, 0.08 * (6 - k), -25 + 50 * uu)
    x, y = path(u); a = 1 - ease_out((t - t1) / 0.25) if t > t1 else 1
    place(fr, CAT, x, y, 1, a, -25 + 50 * u)
FRONT.append(draw_cat); sfx("whoosh_long", 32.65)
TX = tall("PRODUTO", "outline"); blur_in(BEHIND, TX, 34.25, 35.05, 540, top(TX), sound=None)
icon_pop(FRONT, icon("x", 130), 34.45, 35.05, 905, 880)

# estratégias
TX = tall("ESTRATÉGIA  —  ", "red", maxw=99999); marquee(BEHIND, TX, 35.3, 38.5, top(TX), speed=700)
icon_pop(FRONT, icon("target", 170), 35.5, 38.5, 890, 880)
icon_pop(FRONT, icon("brain", 170), 35.85, 38.5, 190, 880, tilt=14)
icon_pop(FRONT, IGs, 37.9, 39.5, 330, 1290)
icon_pop(FRONT, WAs, 38.8, 39.5, 750, 1290, tilt=14)

# crescimento: chart behind, word + rocket, CTA
CH = [(60, 880), (220, 780), (350, 830), (510, 620), (640, 680), (810, 410), (1010, 200)]
def draw_chart(fr, t, t0=40.4):
    if t < t0: return
    s = ease_io((t - t0) / 1.4); segs = list(zip(CH, CH[1:])); n = len(segs)
    pts = [CH[0]]
    for i, (a, b) in enumerate(segs):
        u = min(max(s * n - i, 0), 1)
        if u <= 0: break
        pts.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
    if len(pts) > 1:
        d = ImageDraw.Draw(fr)
        d.line(pts, fill=INK + (255,), width=36, joint="curve"); d.line(pts, fill=ACC + (255,), width=22, joint="curve")
        ex, ey = pts[-1]; d.ellipse((ex - 24, ey - 24, ex + 24, ey + 24), fill=WHITE + (255,), outline=INK, width=7)
BEHIND.append(draw_chart); sfx("rise", 40.4)
char_reveal(FRONT, "CRESCIMENTO", font(ANTON, 160), ACC, 41.3, 42.0, 540, 1230, stroke=6, stroke_fill=INK, stagger=0.025)
LOGO_BIG = shadowed(LOGO.resize((430, 430), Image.LANCZOS), blur=22, off=(0, 14), alpha=150, pad=40)
icon_pop(FRONT, LOGO_BIG, 42.05, 43.6, 540, 1150, sound="impact", tilt=-8, bob=6)
icon_pop(FRONT, icon("rocket", 170), 41.5, 43.5, 900, 300, tilt=14)

pill_a = rounded(380, 120, 60, WHITE + (255,)); pd = ImageDraw.Draw(pill_a)
pd.rounded_rectangle((52, 54, 96, 66), 6, fill=INK); pd.rounded_rectangle((68, 38, 80, 82), 6, fill=INK)
s_ = text_sprite("Seguir", font(MB, 54), INK); pill_a.alpha_composite(s_, (118, (120 - s_.height) // 2))
pill_b = rounded(440, 120, 60, (38, 38, 38, 255)); pd = ImageDraw.Draw(pill_b)
pd.line((52, 62, 68, 78, 96, 44), fill=WHITE, width=9, joint="curve")
s_ = text_sprite("Seguindo", font(MB, 54), WHITE); pill_b.alpha_composite(s_, (118, (120 - s_.height) // 2))
pill_a, pill_b = shadowed(pill_a), shadowed(pill_b)
CTA_T, TAP_T = 42.35, 42.9
def draw_cta(fr, t):
    if t < CTA_T: return
    p = back_out((t - CTA_T) / 0.45)
    if t < TAP_T:
        place(fr, pill_a, 540, 1500, max(p, 0), min(1, (t - CTA_T) / 0.15))
    else:
        k = 1 - 0.08 * math.sin(min(1, (t - TAP_T) / 0.18) * math.pi)
        place(fr, pill_b, 540, 1500, k)
        u = (t - TAP_T) / 0.5
        if u < 1:
            r = 30 + 90 * ease_out(u); patch = Image.new("RGBA", (int(2 * r) + 2, int(2 * r) + 2), (0, 0, 0, 0))
            ImageDraw.Draw(patch).ellipse((0, 0, 2 * r, 2 * r), fill=(255, 255, 255, int(90 * (1 - u))))
            place(fr, patch, 650, 1510)
sfx("pop", CTA_T); sfx("tap", TAP_T)

# ---------------- hook card (covers burned-in text until 6.567s) ----------------
CARD_CX, CARD_CY = 540, 1400
card = Image.new("RGBA", (980, 470), (0, 0, 0, 0))
cm = Image.new("L", card.size, 0); ImageDraw.Draw(cm).rounded_rectangle((0, 0, 979, 469), 46, fill=255)
u = np.linspace(0, 1, 470)[:, None, None]
grad = (np.array(MAROON_TOP) * (1 - u) + np.array(MAROON_BOT) * u).repeat(980, 1)
cg = Image.fromarray(grad.astype(np.uint8)).convert("RGBA"); cg.putalpha(cm)
ImageDraw.Draw(cg).rounded_rectangle((2, 2, 977, 467), 44, outline=ACC + (200,), width=4)
card = shadowed(cg, blur=24, off=(0, 14), alpha=170, pad=50)
l1 = text_sprite("EU FATURO", font(M8, 46), (255, 210, 200), tracking=10)
money = {v: text_sprite(f"R$ {v} MIL", font(ANTON, 190), WHITE) for v in range(0, 41)}
l3 = text_sprite("POR MÊS VENDENDO", font(M8, 54), WHITE)
far = text_sprite("FARINHA", font(MB, 54), WHITE)
far_pill = rounded(far.width + 32, far.height + 24, 12, ACC + (255,)); far_pill.alpha_composite(far, (16, 12))
net = text_sprite("NA INTERNET", font(M8, 54), WHITE)
def draw_hook(fr, t):
    if t > HOOK_END + 0.35: return
    out = ease_in((t - HOOK_END) / 0.3) if t > HOOK_END else 0
    k, a = 1 - 0.2 * out, 1 - out
    place(fr, card, CARD_CX, CARD_CY, k, a, blur=10 * out)
    def rel(x, y): return CARD_CX + (x - CARD_CX) * k, CARD_CY + (y - CARD_CY) * k
    def item(spr, x, y, t0, dy=30):
        p = ease_out((t - t0) / 0.35); cx, cy = rel(x, y + dy * (1 - p)); place(fr, spr, cx, cy, k, a * p)
    item(l1, 540, 1225, -1)
    v = int(round(40 * ease_out(t / 0.9)))
    pop = 1 + 0.08 * math.sin(min(max((t - 0.9) / 0.3, 0), 1) * math.pi)
    cx, cy = rel(540, 1345); place(fr, money[v], cx, cy, k * pop, a)
    item(l3, 540, 1478, 0.9)
    gap = 16; total = far_pill.width + gap + net.width; x0 = 540 - total / 2
    pw = ease_io((t - 1.15) / 0.3)
    if pw > 0.02:
        part = far_pill.crop((0, 0, max(2, int(far_pill.width * pw)), far_pill.height))
        cx, cy = rel(x0 + part.width / 2, 1565); place(fr, part, cx, cy, k, a)
    item(net, x0 + far_pill.width + gap + net.width / 2, 1565, 1.35, 0)
sfx("cash", 0.85, 0.6); sfx("snap", 1.15, 0.8)

# ---------------- name tag ----------------
nt_name = text_sprite("Roberto", font(MB, 60), WHITE)
nt_role = text_sprite("FUNDADOR", font(M7, 28), (255, 210, 200), tracking=6)
nt_logo = LOGO.resize((122, 122), Image.LANCZOS)
tag_w = 150 + max(nt_name.width, nt_role.width) + 50
tag = Image.new("RGBA", (tag_w, 150), (0, 0, 0, 0))
tag.alpha_composite(rounded(tag_w, 150, 75, MAROON_BOT + (235,)))
ImageDraw.Draw(tag).rounded_rectangle((1, 1, tag_w - 2, 148), 75, outline=ACC + (255,), width=4)
tag.alpha_composite(nt_logo, (14, 14))
tag.alpha_composite(nt_name, (152, 30)); tag.alpha_composite(nt_role, (154, 30 + nt_name.height + 18))
tag = shadowed(tag, blur=14, off=(0, 8), alpha=130, pad=30)
def draw_tag(fr, t, t_in=0.5, t_out=3.7):
    if not (t_in <= t < t_out + 0.4): return
    p = ease_io((t - t_in) / 0.35); q = ease_io((t - t_out) / 0.3) if t > t_out else 0
    x0, x1 = int(tag.width * q), int(tag.width * p)
    if x1 - x0 > 2:
        part = tag.crop((x0, 0, x1, tag.height)); place(fr, part, 40 + x0 + part.width / 2, 330)
sfx("swish", 0.45, 0.8)

# ---------------- captions ----------------
CAP_OFF = [(7.15, 9.05), (11.95, 14.4), (15.0, 16.7), (24.2, 27.6), (32.5, 34.05), (41.3, 43.5)]
CAP_FONT = font(MB, 62)
def cap_word(w): return re.sub(r"[,.?!]", "", w).upper()
def build_chunks(words, max_words=3, max_chars=16):
    chunks, cur = [], []
    for w in words:
        txt = cap_word(w["w"])
        if cur and (len(cur) >= max_words or sum(len(c["t"]) + 1 for c in cur) + len(txt) > max_chars or w["s"] - cur[-1]["e"] > 0.25):
            chunks.append(cur); cur = []
        cur.append({"t": txt, "s": w["s"], "e": w["e"]})
        if re.search(r"[,.?!]$", w["w"]): chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    out = []
    for i, c in enumerate(chunks):
        nxt = chunks[i + 1][0]["s"] if i + 1 < len(chunks) else DUR
        out.append({"words": c, "s": c[0]["s"], "e": min(nxt, c[-1]["e"] + 0.35)})
    return out
def cap_sprite(txt, col):
    return shadowed(text_sprite(txt, CAP_FONT, col, stroke=3, stroke_fill=(0, 0, 0)), blur=10, off=(0, 4), alpha=210, pad=20)
def cap_active(txt):
    tx = text_sprite(txt, CAP_FONT, WHITE)
    box = rounded(tx.width + 28, tx.height + 24, 14, ACC + (255,)); box.alpha_composite(tx, (14, 12))
    return shadowed(box, blur=10, off=(0, 4), alpha=170, pad=6)
CHUNKS = build_chunks(WORDS)
for c in CHUNKS:
    for w in c["words"]: w["n"], w["a"] = cap_sprite(w["t"], WHITE), cap_active(w["t"])
def draw_captions(fr, t):
    if any(a <= t < b for a, b in CAP_OFF): return
    y = 1080 if t < HOOK_END + 0.3 else 1560
    for c in CHUNKS:
        if not (c["s"] <= t < c["e"]): continue
        ws = c["words"]; gap = -10
        total = sum(w["n"].width for w in ws) + gap * (len(ws) - 1)
        k0 = min(1.0, 1000 / total); pe = ease_out((t - c["s"]) / 0.16)
        x = 540 - total * k0 / 2
        for w in ws:
            active = w["s"] <= t < w["e"] + 0.05 or (w is ws[-1] and t >= w["s"])
            wn = w["n"].width * k0
            place(fr, w["a"] if active else w["n"], x + wn / 2, y + 14 * (1 - pe), k0 * (1.08 if active else 1.0), pe, blur=5 * (1 - pe))
            x += wn + gap * k0

LOGO_BUG = shadowed(LOGO.resize((118, 118), Image.LANCZOS), blur=10, off=(0, 5), alpha=130, pad=20)
def draw_bug(fr, t, t0=6.8, t1=41.9):
    e = env(t, t0, t1, 0.4, 0.3)
    if e: place(fr, LOGO_BUG, W - 92, 120, 0.85 + 0.15 * ease_out(e[0]), ease_out(e[0]) * (1 - e[1]))

def draw_progress(fr, t):
    bar = Image.new("RGBA", (W - 48, 8), (0, 0, 0, 0)); d = ImageDraw.Draw(bar)
    d.rounded_rectangle((0, 0, W - 49, 7), 4, fill=(255, 255, 255, 80))
    d.rounded_rectangle((0, 0, max(8, int((W - 48) * t / DUR)), 7), 4, fill=ACC + (255,))
    fr.alpha_composite(bar, (24, 22))

def zoom_at(t):
    if t < PHRASES[0]: return 1.0
    i = max(j for j, s in enumerate(PHRASES) if s <= t)
    end = PHRASES[i + 1] if i + 1 < len(PHRASES) else DUR
    return PUNCH.get(PHRASES[i], ZOOMS[i % len(ZOOMS)]) + 0.03 * (t - PHRASES[i]) / (end - PHRASES[i])

for tt in TRANSITIONS: sfx("whoosh", tt - 0.15, 0.9)

# ---------------- audio: SFX bed ----------------
def load_snd(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{SOUNDS}/{name}.mp3", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    return x / (np.abs(x).max() + 1e-9)
def synth(kind):
    from scipy.signal import butter, sosfilt
    rng = np.random.default_rng(abs(hash(kind)) % 1000)
    bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)
    if kind in ("whoosh", "whoosh_long", "swish"):
        dur = {"whoosh": 0.5, "whoosh_long": 0.9, "swish": 0.28}[kind]
        n = int(dur * SR); x = rng.standard_normal(n); y = np.zeros(n); step = 1200
        for k in range(0, n, step):
            u = k / n; fc = 400 + 5000 * math.sin(math.pi * u) ** 2 if kind != "swish" else 6000 - 4500 * u
            y[k:k + step] = bp(x[k:k + step], fc * 0.6, min(fc * 1.6, 20000))
        return 0.9 * y * np.sin(np.linspace(0, math.pi, n)) ** 2 / (np.abs(y).max() + 1e-9)
    if kind == "impact":
        n = int(0.9 * SR); tt = np.arange(n) / SR
        body = np.sin(2 * math.pi * np.cumsum(45 + 90 * np.exp(-tt * 20)) / SR) * np.exp(-tt * 5)
        return np.tanh(2.2 * body) * 0.9 + 0.3 * bp(rng.standard_normal(n), 200, 3000) * np.exp(-tt * 30)
    if kind == "coins":
        n = int(0.9 * SR); y = np.zeros(n); tt = np.arange(n) / SR
        for k in range(10):
            t0 = int(rng.uniform(0, 0.45) * SR); f = rng.uniform(3000, 6500); m = n - t0
            y[t0:] += np.sin(2 * math.pi * f * tt[:m]) * np.exp(-tt[:m] * 28) * rng.uniform(0.3, 0.7)
        return y / np.abs(y).max() * 0.6
    if kind == "rise":
        n = int(1.4 * SR); tt = np.arange(n) / SR
        return 0.35 * np.sin(2 * math.pi * np.cumsum(300 + 900 * (tt / 1.4) ** 2) / SR) * (tt / 1.4) * np.minimum(1, (1.4 - tt) * 8)
SND = {"pop": (load_snd("water_droplet"), 0.9), "tick": (load_snd("button_tiny"), 0.6), "snap": (load_snd("snap"), 0.8),
       "tap": (load_snd("button_click_on"), 0.9), "shutter": (load_snd("camera_flashing"), 0.8), "cash": (load_snd("bell_ring"), 0.6)}
for k in ("whoosh", "whoosh_long", "swish", "impact", "coins", "rise"): SND[k] = (synth(k), 0.8)
track = np.zeros(int((DUR + 2) * SR))
for kind, t, gain in SFX:
    s, g = SND[kind]; i = max(0, int(t * SR)); j = min(len(track), i + len(s)); track[i:j] += g * gain * s[: j - i]
track = np.clip(track * 0.5, -1, 1)
(track * 32767).astype(np.int16).tofile(f"{TMP}/sfx.raw")

# ---------------- render ----------------
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-t", str(DUR), "-vf",
    "scale=1080:1920:flags=lanczos,eq=contrast=1.08:saturation=1.2:gamma=0.97,"
    "colorbalance=rm=0.03:bm=-0.04:rh=0.02:bh=-0.02,unsharp=5:5:0.55,vignette=angle=PI/7",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
    "-i", SRC, "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", f"{TMP}/sfx.raw", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", MUSIC,
    "-filter_complex",
    "[1:a]highpass=f=80,acompressor=threshold=0.1:ratio=3:attack=5:release=120,loudnorm=I=-15:TP=-2:LRA=8,aresample=48000,"
    "aformat=channel_layouts=stereo,asplit=2[v][key];"
    "[3:a]volume=0.55[mus];[mus][key]sidechaincompress=threshold=0.08:ratio=2.5:attack=20:release=300:makeup=1[duck];"
    "[2:a]aformat=channel_layouts=stereo,volume=0.7[s];"
    "[v][duck][s]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89[a]",
    "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", OUT], stdin=subprocess.PIPE)

LUT = [int(255 * min(1, max(0, (v / 255 - 0.3) / 0.4))) for v in range(256)]
fs = W * H * 3; n = 0
while True:
    buf = dec.stdout.read(fs)
    if len(buf) < fs: break
    t = n / FPS
    img = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1)
    z = zoom_at(t); cw, ch = W / z, H / z
    x0, y0 = (W - cw) * 0.5, (H - ch) * 0.25
    box = (x0, y0, x0 + cw, y0 + ch)
    if z > 1.0005: img = img.resize((W, H), Image.BICUBIC, box=box)
    dk = darken_at(t)
    if dk > 0: img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), dk)
    fr = img.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for f_ in BEHIND: f_(layer, t)
    if layer.getbbox():
        m = Image.fromarray(MASK[min(n, len(MASK) - 1)]).point(LUT).resize((W, H), Image.BILINEAR, box=tuple(v / 3 for v in box))
        la = np.asarray(layer.split()[3], np.uint16) * (255 - np.asarray(m, np.uint16)) // 255
        layer.putalpha(Image.fromarray(la.astype(np.uint8)))
        fr.alpha_composite(layer)
    draw_hook(fr, 2.0 if n == 0 else t)
    draw_tag(fr, t)
    for f_ in FRONT: f_(fr, t)
    draw_captions(fr, t)
    draw_bug(fr, t)
    draw_cta(fr, t)
    out = fr.convert("RGB")
    # zoom-blur transitions (radial smear of the finished frame)
    for tt in TRANSITIONS:
        u = (t - tt) / 0.2
        if -0.5 <= u < 1:
            s = (1 - abs(u)) if u < 0 else (1 - u)
            acc = np.asarray(out, np.float32)
            for k in range(1, 5):
                zz = 1 + 0.035 * k * s; cw2, ch2 = W / zz, H / zz
                acc += np.asarray(out.resize((W, H), Image.BILINEAR, box=((W - cw2) / 2, (H - ch2) / 2, (W + cw2) / 2, (H + ch2) / 2)), np.float32)
            out = Image.fromarray((acc / 5).astype(np.uint8))
    dx, dy = shake_offset(t)
    if dx or dy:
        m_ = 34; out = out.resize((W, H), Image.BICUBIC, box=(m_ + dx, m_ + dy, W - m_ + dx, H - m_ + dy))
    fo = out.convert("RGBA"); draw_progress(fo, t)
    enc.stdin.write(fo.convert("RGB").tobytes())
    n += 1
    if n % 150 == 0: print(f"{t:.1f}s", flush=True)
enc.stdin.close(); enc.wait(); dec.wait()
print("frames", n, "rc", enc.returncode)
