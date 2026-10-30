"""v3 motion design: Anton/Montserrat typography, per-letter reveals, blur-ins, box wipes,
official brand icons + line-icon badges with ring bursts, text behind the speaker
(person mask), zoom-blur transitions, money drop synced to the music, SFX + music mix."""
import subprocess, sys, math, json, re, random, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT, WORDS_JSON, MASKS, ICONS, FONTS, SOUNDS, MUSIC, TMP = sys.argv[1:10]
W, H, FPS, SR = 1080, 1920, 30, 48000
DUR = 31.5
random.seed(11)

ANTON = f"{FONTS}/fontsource-anton-5.3.0/package/files/anton-latin-400-normal.woff"
MB = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-900-normal.woff"
MBI = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-900-italic.woff"
M8 = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-800-normal.woff"
M7 = f"{FONTS}/fontsource-montserrat-5.0.19/package/files/montserrat-latin-700-normal.woff"
ACC, INK, WHITE = (29, 78, 216), (11, 26, 74), (255, 255, 255)   # Progredir royal blue + navy
ACC2 = (255, 153, 0)                                              # orange accent (their calendar)
NAVY_TOP, NAVY_BOT = (30, 64, 175), (11, 26, 74)
RED, GREEN = (240, 68, 68), (34, 197, 94)

HOOK_END = -1.0
PHRASES = [2.67, 4.62, 8.65, 10.6, 12.62, 13.6, 15.95, 17.3, 19.6, 21.35, 24.6, 27.65]
ZOOMS = [1.05, 1.0, 1.07, 1.03]   # gentle: the original captions run almost edge to edge
PUNCH = {15.95: 1.08, 21.35: 1.0, 24.6: 1.0}
TRANSITIONS = [4.62, 8.65, 12.62, 17.3, 27.65]
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
    elif style == "blue": spr = text_sprite(txt, f, ACC, stroke=max(3, size // 70), stroke_fill=INK, tracking=track)
    elif style == "orange": spr = text_sprite(txt, f, ACC2, stroke=max(4, size // 55), stroke_fill=INK, tracking=track)
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

# ================= TIMELINE (Progredir — Feira de Carreiras do Mundo Senai) =================
IGs, WAs = icon("instagram", 160), icon("whatsapp", 160)

# hook: "Você sabe o que é uma feira de carreiras?" — the two lines stand tall behind her head
TX1, TX2 = tall("FEIRA DE", "blue", maxh=250, stretch=1.6), tall("CARREIRAS?", "ink", maxh=270, stretch=1.6)
blur_in(BEHIND, TX1, 1.3, 2.6, 540, 40 + TX1.height / 2, sound="whoosh")
blur_in(BEHIND, TX2, 1.55, 2.6, 540, 40 + TX1.height + TX2.height / 2 - 10, sound=None)
icon_pop(FRONT, icon("question", 170), 0.5, 2.6, 900, 700)

# "se não, fica nesse vídeo!"
icon_pop(FRONT, icon("eye", 160), 3.3, 4.45, 180, 760)

# "é um espaço de conexão entre empresas e candidatos" — behind word, then a bar that also
# covers the original edit's purple label (on screen 6.6–8.45 s at y≈1275–1410)
TX = tall("CONEXÃO", "blue"); blur_in(BEHIND, TX, 6.3, 8.5, 540, top(TX, 40))
def conn_bar():
    bar = rounded(940, 170, 30, NAVY_BOT + (255,))
    d = ImageDraw.Draw(bar); d.rounded_rectangle((2, 2, 937, 167), 28, outline=ACC + (255,), width=4)
    b = Image.open(f"{ICONS}/building.png").convert("RGBA").resize((96, 96), Image.LANCZOS)
    u = Image.open(f"{ICONS}/users.png").convert("RGBA").resize((96, 96), Image.LANCZOS)
    e = text_sprite("EMPRESAS", font(ANTON, 70), WHITE); c = text_sprite("CANDIDATOS", font(ANTON, 70), WHITE)
    bar.alpha_composite(b, (26, 37)); bar.alpha_composite(e, (134, (170 - e.height) // 2))
    d.line((410, 70, 490, 70), fill=ACC2 + (255,), width=10); d.polygon([(490, 54), (520, 70), (490, 86)], fill=ACC2 + (255,))
    d.line((450, 102, 530, 102), fill=ACC2 + (255,), width=10); d.polygon([(450, 86), (420, 102), (450, 118)], fill=ACC2 + (255,))
    bar.alpha_composite(u, (548, 37)); bar.alpha_composite(c, (656, (170 - c.height) // 2))
    return shadowed(bar, blur=16, off=(0, 10), alpha=150, pad=30)
CONN = conn_bar()
def draw_conn(fr, t, t0=6.52, t1=8.5):
    e = env(t, t0, t1, 0.12, 0.25)
    if not e: return
    p, q = ease_io(e[0]), ease_io(e[1])
    x0, x1 = int(CONN.width * q), int(CONN.width * max(p, 0.02))
    if x1 - x0 > 2:
        part = CONN.crop((x0, 0, x1, CONN.height)); place(fr, part, 540 - CONN.width / 2 + x0 + part.width / 2, 1342)
sfx("pop", 7.0, 0.7); sfx("pop", 7.45, 0.7)

# "as empresas apresentam o que fazem e as oportunidades que elas oferecem"
icon_pop(FRONT, icon("building", 170), 8.8, 10.5, 175, 760)
TX = tall("OPORTUNIDADES", "blue"); blur_in(BEHIND, TX, 10.85, 12.45, 540, top(TX, 40))
icon_pop(FRONT, icon("briefcase", 170), 10.9, 12.45, 905, 760, tilt=14)

# "ou seja, você conversa direto com quem pode te proporcionar"
icon_pop(FRONT, icon("chat", 170), 13.85, 15.8, 180, 760)
icon_pop(FRONT, icon("handshake", 170), 14.55, 15.8, 900, 760, tilt=14)
char_reveal(FRONT, "DIRETO COM QUEM DECIDE", font(MB, 58), WHITE, 14.2, 15.8, 540, 1600, stagger=0.02)

# ---------- WOW: "seu primeiro estágio!" (music drops here) ----------
WOW = 15.95
DARKEN.append((15.0, WOW, 0.45))
flash(WOW); shake(WOW); sfx("shutter", WOW - 0.02); sfx("cash", WOW + 0.35, 0.7)
TX = tall("ESTÁGIO", "blue", stretch=1.9); blur_in(BEHIND, TX, WOW, 17.2, 540, top(TX, 30), k0=1.5, sound="impact")
box_wipe(FRONT, "ESTÁGIO!", font(ANTON, 170), ACC, WHITE, WOW + 0.35, 17.2, 540, 1600, sound="impact")
icon_pop(FRONT, icon("grad", 180), WOW + 0.2, 17.2, 170, 860)
icon_pop(FRONT, icon("star", 150), WOW + 0.4, 17.2, 910, 860, tilt=14)
CONF_COLS = [ACC, ACC2, WHITE, (96, 165, 250), (34, 197, 94)]
CONF = []
for i in range(70):
    CONF.append(dict(t0=WOW + random.uniform(0, 0.15), x=540 + random.uniform(-120, 120), y=1100,
                     vx=random.uniform(-1100, 1100), vy=random.uniform(-2100, -900), col=random.choice(CONF_COLS),
                     w=random.uniform(16, 30), h=random.uniform(8, 14), rot=random.uniform(0, 360), vr=random.uniform(-720, 720)))
_conf_spr = {}
def draw_confetti(fr, t):
    if not (WOW <= t <= WOW + 2.4): return
    fade = 1 - ease_in((t - WOW - 1.8) / 0.6)
    for c in CONF:
        dt = t - c["t0"]
        if dt < 0: continue
        x = c["x"] + c["vx"] * dt * math.exp(-dt * 0.9); y = c["y"] + c["vy"] * dt + 1500 * dt * dt
        if y > H + 40: continue
        key = (c["col"], int(c["w"]), int(c["h"]))
        if key not in _conf_spr: _conf_spr[key] = rounded(int(c["w"]), int(c["h"]), 3, c["col"] + (255,))
        place(fr, _conf_spr[key], x, y, 1, fade, c["rot"] + c["vr"] * dt)
FRONT.append(draw_confetti)

# "a feira de carreiras do Mundo Senai acontece no dia 5 de novembro, na quinta"
TX = tall("MUNDO SENAI", "blue"); blur_in(BEHIND, TX, 18.25, 19.6, 540, top(TX, 40))
icon_pop(FRONT, icon("pin", 170), 18.6, 19.75, 905, 760, tilt=14)
def date_card():
    c = Image.new("RGBA", (520, 420), (0, 0, 0, 0))
    c.alpha_composite(rounded(520, 420, 40, WHITE + (255,)))
    hd = rounded(520, 120, 40, ACC + (255,)); ImageDraw.Draw(hd).rectangle((0, 60, 519, 119), fill=ACC + (255,))
    c.alpha_composite(hd, (0, 0))
    m = text_sprite("NOVEMBRO", font(ANTON, 76), WHITE); c.alpha_composite(m, ((520 - m.width) // 2, (120 - m.height) // 2))
    dnum = text_sprite("05", font(ANTON, 200), NAVY_BOT); c.alpha_composite(dnum, ((520 - dnum.width) // 2, 140))
    q = text_sprite("QUINTA-FEIRA", font(MB, 42), ACC2, tracking=3); c.alpha_composite(q, ((520 - q.width) // 2, 350))
    d = ImageDraw.Draw(c)
    for x in (130, 390): d.rounded_rectangle((x - 12, -2, x + 12, 46), 10, fill=NAVY_BOT + (255,))
    return shadowed(c, blur=22, off=(0, 14), alpha=160, pad=40)
DATE = date_card()
def draw_date(fr, t, t0=19.9, t1=21.3):
    e = env(t, t0, t1, 0.6, 0.25)
    if not e: return
    k = elastic((t - t0) / 0.7) * (1 - ease_in(e[1]))
    place(fr, DATE, 905, 790, 0.5 * max(0, k), 1 - e[1], -6 * (1 - ease_out((t - t0) / 0.5)))
FRONT.append(draw_date); sfx("impact", 19.9, 0.8)

# "e é claro que a Progredir vai tá marcando presença"
TX = tall("PROGREDIR", "blue"); blur_in(BEHIND, TX, 22.2, 23.62, 540, top(TX, 40))
box_wipe(FRONT, "PRESENÇA CONFIRMADA", font(ANTON, 84), ACC, WHITE, 23.1, 23.62, 540, 1600)
icon_pop(FRONT, icon("check", 150), 23.2, 23.62, 905, 790)

# "anota aí no seu calendário e venha conversar com a gente" — the calendar prop is in frame
TX = tall("05/11", "orange", stretch=1.9); blur_in(BEHIND, TX, 24.55, 27.6, 540, top(TX, 30), k0=1.4)
icon_pop(FRONT, icon("calendar", 170), 24.65, 27.6, 170, 760)
icon_pop(FRONT, icon("chat", 160), 26.6, 27.6, 910, 760, tilt=14)

# "seu futuro tá te esperando!"
TX = tall("SEU FUTURO", "blue"); blur_in(BEHIND, TX, 27.6, 29.3, 540, top(TX, 40))
icon_pop(FRONT, icon("rocket", 170), 28.0, 29.3, 905, 760, tilt=14)

# ---------------- end card over the original fade-to-black ----------------
END_T = 29.25
def end_bg():
    u = np.linspace(0, 1, H)[:, None, None]
    g = (np.array(NAVY_TOP) * (1 - u) + np.array(NAVY_BOT) * u).repeat(W, 1)
    return Image.fromarray(g.astype(np.uint8)).convert("RGBA")
END_BG = end_bg()
E1 = text_sprite("FEIRA DE CARREIRAS", font(ANTON, 120), WHITE)
E3 = text_sprite("PROGREDIR VAI ESTAR LÁ", font(MB, 46), (191, 219, 254), tracking=2)
def draw_end(fr, t):
    if t < END_T: return
    a = ease_out((t - END_T) / 0.35)
    fr.alpha_composite(with_alpha(END_BG, a))
    def at(spr, y, t0):
        p = ease_out((t - t0) / 0.35); place(fr, spr, 540, y + 40 * (1 - p), 1, p, blur=6 * (1 - p))
    at(shadowed(E1, blur=14, off=(0, 8), alpha=150, pad=30), 500, END_T + 0.1)
    at(DATE_SMALL, 990, END_T + 0.25)
    at(E3, 1280, END_T + 0.45)
DATE_SMALL = scaled(DATE, 0.72)
for tt in (END_T + 0.1, END_T + 0.25): sfx("whoosh", tt - 0.05, 0.7)
def draw_ms(fr, t):
    """'MUNDO SENAI' pill on the end card"""
    if t < END_T + 0.18: return
    p = ease_io((t - END_T - 0.18) / 0.3)
    spr = MS_PILL; part = spr.crop((0, 0, max(2, int(spr.width * p)), spr.height))
    place(fr, part, 540 - spr.width / 2 + part.width / 2, 655)
_t = text_sprite("MUNDO SENAI", font(ANTON, 96), WHITE)
MS_PILL = rounded(_t.width + 60, _t.height + 36, 18, ACC + (255,)); MS_PILL.alpha_composite(_t, (30, 18)); MS_PILL = shadowed(MS_PILL)

pill_a = rounded(380, 120, 60, WHITE + (255,)); pd = ImageDraw.Draw(pill_a)
pd.rounded_rectangle((52, 54, 96, 66), 6, fill=NAVY_BOT); pd.rounded_rectangle((68, 38, 80, 82), 6, fill=NAVY_BOT)
s_ = text_sprite("Seguir", font(MB, 54), NAVY_BOT); pill_a.alpha_composite(s_, (118, (120 - s_.height) // 2))
pill_b = rounded(440, 120, 60, ACC + (255,)); pd = ImageDraw.Draw(pill_b)
pd.line((52, 62, 68, 78, 96, 44), fill=WHITE, width=9, joint="curve")
s_ = text_sprite("Seguindo", font(MB, 54), WHITE); pill_b.alpha_composite(s_, (118, (120 - s_.height) // 2))
pill_a, pill_b = shadowed(pill_a), shadowed(pill_b)
CTA_T, TAP_T = 30.15, 30.75
def draw_cta(fr, t):
    if t < CTA_T: return
    p = back_out((t - CTA_T) / 0.45)
    if t < TAP_T:
        place(fr, pill_a, 540, 1470, max(p, 0), min(1, (t - CTA_T) / 0.15))
    else:
        k = 1 - 0.08 * math.sin(min(1, (t - TAP_T) / 0.18) * math.pi)
        place(fr, pill_b, 540, 1470, k)
        u = (t - TAP_T) / 0.5
        if u < 1:
            r = 30 + 90 * ease_out(u); patch = Image.new("RGBA", (int(2 * r) + 2, int(2 * r) + 2), (0, 0, 0, 0))
            ImageDraw.Draw(patch).ellipse((0, 0, 2 * r, 2 * r), fill=(255, 255, 255, int(90 * (1 - u))))
            place(fr, patch, 650, 1480)
sfx("pop", CTA_T); sfx("tap", TAP_T)

# ---------------- captions ----------------
CAP_OFF = [(1.3, 2.6), (3.8, 4.5), (6.5, 8.5), (14.2, 15.8), (15.95, 17.25), (19.85, 21.3), (23.25, 23.62), (28.25, 29.3), (29.25, 99)]
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
    y = 1150 if 24.0 <= t <= 28.3 else 1300   # sit above the calendar prop while it is in frame
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
    "[v][duck][s]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.84:level=disabled[a]",
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
    for f_ in BEHIND: f_(layer, 2.2 if n == 0 else t)   # frame 0 doubles as the cover: show the hook title
    if layer.getbbox():
        m = Image.fromarray(MASK[min(n, len(MASK) - 1)]).point(LUT).resize((W, H), Image.BILINEAR, box=tuple(v / 3 for v in box))
        la = np.asarray(layer.split()[3], np.uint16) * (255 - np.asarray(m, np.uint16)) // 255
        layer.putalpha(Image.fromarray(la.astype(np.uint8)))
        fr.alpha_composite(layer)
    for f_ in FRONT: f_(fr, 2.2 if n == 0 else t)
    draw_end(fr, t)
    draw_ms(fr, t)
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
