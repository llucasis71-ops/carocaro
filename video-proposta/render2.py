"""Motion-graphics edit: text behind the speaker (person mask), kinetic text in varied
sizes, animated icons, money counter with particles, flash/shake, chart, SFX."""
import subprocess, sys, math, json, re, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT, WORDS_JSON, MASKS, SFX_WAV = sys.argv[1:6]
W, H, FPS = 1080, 1920, 30
DUR = 43.4
random.seed(7)

BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
XBOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
YEL = (255, 201, 40)
INK = (14, 14, 14)
WHITE = (255, 255, 255)
RED = (235, 59, 59)
GREEN = (46, 204, 113)

HOOK_END = 6.567
PHRASES = [7.28, 9.48, 14.70, 17.00, 21.06, 22.14, 23.76, 26.96, 29.50, 32.42, 35.03, 36.64, 38.62, 39.88, 42.48]
ZOOMS = [1.10, 1.03, 1.14, 1.06]
PUNCH = {23.76: 1.18}
WORDS = json.load(open(WORDS_JSON))
MASK = np.load(MASKS)          # (frames, 640, 360) uint8

_fonts = {}
def font(path, size):
    if (path, size) not in _fonts: _fonts[(path, size)] = ImageFont.truetype(path, size)
    return _fonts[(path, size)]

# ---------------- sprite helpers ----------------
def text_sprite(txt, f, fill, stroke=0, stroke_fill=None, tracking=0):
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    widths = [tmp.textlength(c, font=f) + tracking for c in txt]
    asc, desc = f.getmetrics()
    w = int(sum(widths) - tracking + 2 * stroke + 4)
    h = asc + desc + 2 * stroke + 4
    img = Image.new("RGBA", (max(w, 1), h), (0, 0, 0, 0))
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

def shadowed(img, blur=18, off=(0, 10), alpha=150, pad=40, color=(0, 0, 0)):
    w, h = img.size
    out = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, color + (0,))
    a = img.split()[3].point(lambda v: v * alpha // 255)
    sh.paste(color + (255,), (pad + off[0], pad + off[1]), a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    out = Image.alpha_composite(sh, out)
    out.alpha_composite(img, (pad, pad))
    return out

def fit(spr, maxw):
    if spr.width <= maxw: return spr
    k = maxw / spr.width
    return spr.resize((int(spr.width * k), int(spr.height * k)), Image.LANCZOS)

def emoji(ch, size):
    f = font(EMOJI, 109)
    img = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((10, 10), ch, font=f, embedded_color=True)
    img = img.crop(img.getbbox())
    k = size / max(img.size)
    return shadowed(img.resize((int(img.width * k), int(img.height * k)), Image.LANCZOS), blur=10, off=(0, 8), alpha=120, pad=24)

def instagram_icon(s):
    yy, xx = np.mgrid[0:s, 0:s]
    d = (xx + (s - yy)) / (2 * s)          # bottom-left -> top-right
    stops = [(0, (254, 218, 117)), (0.3, (250, 126, 30)), (0.55, (214, 41, 118)), (0.8, (150, 47, 191)), (1, (79, 91, 213))]
    rgb = np.zeros((s, s, 3))
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (d >= p0) & (d <= p1)
        u = ((d - p0) / (p1 - p0))[m][:, None]
        rgb[m] = np.array(c0) * (1 - u) + np.array(c1) * u
    grad = Image.fromarray(rgb.astype(np.uint8)).convert("RGBA")
    mask = Image.new("L", (s, s), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), int(s * 0.24), fill=255)
    grad.putalpha(mask)
    dr = ImageDraw.Draw(grad); lw = int(s * 0.075)
    dr.rounded_rectangle((s * .2, s * .2, s * .8, s * .8), int(s * .17), outline=WHITE, width=lw)
    dr.ellipse((s * .35, s * .35, s * .65, s * .65), outline=WHITE, width=lw)
    dr.ellipse((s * .66, s * .27, s * .72, s * .33), fill=WHITE)
    return shadowed(grad, blur=12, off=(0, 10), alpha=130, pad=28)

def whatsapp_icon(s):
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0)); dr = ImageDraw.Draw(img)
    dr.ellipse((0, 0, s - 1, s - 1), fill=(37, 211, 102))
    c, r = s / 2, s * 0.33
    dr.ellipse((c - r, c - r, c + r, c + r), outline=WHITE, width=int(s * 0.06))
    dr.polygon([(c - r * 0.95, c + r * 0.45), (c - r * 1.25, c + r * 1.25), (c - r * 0.35, c + r * 0.98)], fill=WHITE)
    # handset: thick arc with rounded ends
    hr = r * 0.52; lw = int(s * 0.085)
    dr.arc((c - hr, c - hr, c + hr, c + hr), 110, 250, fill=WHITE, width=lw)
    for ang in (110, 250):
        a = math.radians(ang); px, py = c + (hr - lw / 2) * math.cos(a), c + (hr - lw / 2) * math.sin(a)
        dr.ellipse((px - lw * .8, py - lw * .8, px + lw * .8, py + lw * .8), fill=WHITE)
    img = img.rotate(-45, resample=Image.BICUBIC, center=(c, c))
    return shadowed(img, blur=12, off=(0, 10), alpha=130, pad=28)

def ease_out(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def ease_in_out(x): x = min(max(x, 0), 1); return 3 * x * x - 2 * x * x * x
def back_out(x, s=1.7):
    x = min(max(x, 0), 1) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2

def place(frame, spr, cx, cy, scale=1.0, alpha=1.0, rot=0.0):
    if alpha <= 0.01 or scale <= 0.01: return
    if abs(scale - 1) > 1e-3:
        spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BICUBIC)
    if abs(rot) > 0.1:
        spr = spr.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 0.999:
        spr = spr.copy(); spr.putalpha(spr.split()[3].point(lambda v: int(v * alpha)))
    frame.alpha_composite(spr, (int(cx - spr.width / 2), int(cy - spr.height / 2)), ) if (
        0 <= int(cx - spr.width / 2) and 0 <= int(cy - spr.height / 2)) else _paste_clipped(frame, spr, cx, cy)

def _paste_clipped(frame, spr, cx, cy):
    x, y = int(cx - spr.width / 2), int(cy - spr.height / 2)
    sx, sy = max(0, -x), max(0, -y)
    if sx >= spr.width or sy >= spr.height: return
    frame.alpha_composite(spr.crop((sx, sy, spr.width, spr.height)), (max(0, x), max(0, y)))

def env(t, t0, t1, fin=0.25, fout=0.22):
    """0..1 visibility envelope with intro/outro progress."""
    if t < t0 or t > t1 + fout: return None
    return ease_out((t - t0) / fin), ease_out((t - t1) / fout) if t > t1 else 0.0

# ---------------- big-text styles ----------------
def big(txt, size, style="yellow", maxw=1040):
    f = font(BLACK, size)
    if style == "yellow": spr = text_sprite(txt, f, YEL, stroke=max(6, size // 22), stroke_fill=INK)
    elif style == "white": spr = text_sprite(txt, f, WHITE, stroke=max(6, size // 22), stroke_fill=INK)
    elif style == "ink": spr = text_sprite(txt, f, INK)
    elif style == "outline": spr = text_sprite(txt, f, (0, 0, 0, 0), stroke=max(5, size // 28), stroke_fill=INK)
    return fit(shadowed(spr, blur=14, off=(0, 10), alpha=120, pad=30), maxw)

# ---------------- elements ----------------
BEHIND, FRONT, SFX = [], [], []

def behind(fn): BEHIND.append(fn); return fn
def front(fn): FRONT.append(fn); return fn
def sfx(kind, t, gain=1.0): SFX.append((kind, t, gain))

def text_punch(layer, spr, t0, t1, x, y, start_scale=1.6, sound="whoosh", rot=0):
    if sound: sfx(sound, t0 - 0.12)
    def draw(fr, t):
        e = env(t, t0, t1, 0.28)
        if not e: return
        p, q = e
        k = start_scale + (1 - start_scale) * ease_out((t - t0) / 0.28)
        place(fr, spr, x, y, k * (1 - 0.2 * q), p * (1 - q), rot)
    layer.append(draw)

def text_slide(layer, spr, t0, t1, x, y, frm="right", sound="whoosh"):
    if sound: sfx(sound, t0 - 0.1)
    def draw(fr, t):
        e = env(t, t0, t1, 0.35)
        if not e: return
        p, q = e
        dx = {"right": 1, "left": -1}[frm] * (W * (1 - p) - W * q)
        place(fr, spr, x + dx, y, 1, min(1, p * 1.5))
    layer.append(draw)

def marquee(layer, spr, t0, t1, y, speed=-520, sound="whoosh"):
    if sound: sfx(sound, t0 - 0.1)
    gap = 60
    def draw(fr, t):
        e = env(t, t0, t1, 0.2, 0.25)
        if not e: return
        p, q = e
        period = spr.width + gap
        off = ((t - t0) * speed) % period
        x = -period + off
        while x < W + period:
            place(fr, spr, x + spr.width / 2, y, 1, p * (1 - q))
            x += period
    layer.append(draw)

def icon_pop(layer, spr, t0, t1, x, y, bob=12, sound="pop", rot0=-18):
    if sound: sfx(sound, t0)
    ph = random.random() * 6
    def draw(fr, t):
        e = env(t, t0, t1, 0.4, 0.2)
        if not e: return
        p, q = e
        k = max(0, back_out((t - t0) / 0.4, 2.4)) * (1 - q)
        place(fr, spr, x, y + bob * math.sin((t - t0) * 3 + ph), k, 1, rot0 * (1 - ease_out((t - t0) / 0.4)) + 4 * math.sin((t - t0) * 2.2 + ph))
    layer.append(draw)

def crossed(base, size):
    """icon with a red X stamped over it"""
    x = emoji("❌", int(size * 0.62))
    img = Image.new("RGBA", (base.width + 20, base.height + 20), (0, 0, 0, 0))
    img.alpha_composite(base, (10, 10))
    img.alpha_composite(x, (img.width - x.width, img.height - x.height))
    return img

def flash(t0, dur=0.28, strength=0.75):
    def draw(fr, t):
        if not (t0 <= t < t0 + dur): return
        a = strength * (1 - (t - t0) / dur) ** 2
        fr.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(255 * a))))
    FRONT.append(draw)

SHAKES = []
def shake(t0, dur=0.45, amp=26): SHAKES.append((t0, dur, amp))
def shake_offset(t):
    dx = dy = 0.0
    for t0, dur, amp in SHAKES:
        if t0 <= t < t0 + dur:
            k = amp * (1 - (t - t0) / dur) ** 2
            dx += k * math.sin(t * 91.0); dy += k * math.cos(t * 77.0)
    return dx, dy

# ================= TIMELINE =================
IG, WA = instagram_icon(220), whatsapp_icon(220)
IG_S, WA_S = instagram_icon(170), whatsapp_icon(170)

# hook (0 - 6.57): card handled separately; "O que nós vendemos aqui?" thinking icon
icon_pop(FRONT, emoji("🤔", 170), 3.9, 5.2, 870, 640)
# "uma commodity" behind him
text_punch(BEHIND, big("COMMODITY", 210, "ink"), 6.05, 6.9, 540, 400, start_scale=1.3)

# "farinha de mandioca" - marquee passing behind + wheat icons
marquee(BEHIND, big("FARINHA DE MANDIOCA •", 230, "yellow", maxw=99999), 7.15, 9.1, 250, speed=-900)
text_punch(FRONT, big("100% MANDIOCA", 96, "white"), 7.85, 9.0, 540, 1330, start_scale=0.4, sound="pop")
icon_pop(FRONT, emoji("🌾", 190), 7.35, 9.0, 150, 1000)
icon_pop(FRONT, emoji("🌾", 190), 7.55, 9.0, 930, 1000, rot0=18)

# "utilizando APENAS Instagram e WhatsApp"
text_punch(BEHIND, big("APENAS", 300, "ink"), 10.15, 11.6, 540, 230)
icon_pop(FRONT, IG, 10.62, 13.0, 190, 820)
icon_pop(FRONT, WA, 11.28, 13.0, 890, 820, rot0=18)
# "consumidores finais" stacked, varied sizes
text_punch(FRONT, big("PRO", 90, "white"), 12.0, 14.35, 540, 1210, start_scale=0.3, sound="pop")
text_punch(FRONT, big("CONSUMIDOR", 140, "white"), 12.85, 14.35, 540, 1320, start_scale=0.3, sound=None)
text_punch(FRONT, big("FINAL", 210, "yellow"), 13.95, 14.35, 540, 1470, start_scale=2.2, sound="pop")
icon_pop(FRONT, emoji("🛒", 150), 13.2, 14.35, 900, 1180)

# "não é ATACADO, é VAREJO"
atac = big("ATACADO", 150, "white")
def draw_atacado(fr, t, t0=15.05, t1=16.6):
    e = env(t, t0, t1, 0.25)
    if not e: return
    p, q = e
    place(fr, atac, 540, 1250, 1, p * (1 - q))
    s = ease_out((t - 15.55) / 0.22)
    if s > 0:
        d = ImageDraw.Draw(fr); w = atac.width - 70
        d.line((540 - w / 2, 1255, 540 - w / 2 + w * s, 1240), fill=RED + (int(255 * (1 - q)),), width=18)
FRONT.append(draw_atacado); sfx("whoosh", 14.95); sfx("swipe", 15.5)
icon_pop(FRONT, emoji("❌", 120), 15.6, 16.6, 920, 1170, sound=None)
text_punch(FRONT, big("VAREJO", 230, "yellow"), 15.92, 16.6, 540, 1440, start_scale=2.4, sound="impact")
icon_pop(FRONT, emoji("✅", 130), 16.05, 16.6, 940, 1360, sound=None)

# "sem depender de LOJA aberta, sem depender de PESSOAS na RUA"
text_slide(BEHIND, big("SEM LOJA", 250, "ink"), 17.0, 18.6, 540, 230, frm="right")
icon_pop(FRONT, crossed(emoji("🏪", 210), 210), 17.85, 18.65, 170, 760)
text_slide(BEHIND, big("SEM RUA", 260, "yellow"), 18.7, 20.75, 540, 230, frm="left")
icon_pop(FRONT, crossed(emoji("🚶", 210), 210), 19.5, 20.75, 910, 760, rot0=18)

# "SÓ utilizando INSTAGRAM e WHATSAPP"
text_punch(BEHIND, big("SÓ", 460, "yellow"), 21.02, 22.1, 290, 420, start_scale=1.8, sound="impact")
text_punch(FRONT, big("+", 200, "white"), 22.75, 23.6, 540, 1240, start_scale=0.2, sound=None)
icon_pop(FRONT, IG, 22.12, 23.6, 330, 1240)
icon_pop(FRONT, WA, 23.02, 23.6, 750, 1240, rot0=18)

# ---------- WOW: R$ 40.000 por mês ----------
COUNT_T0, COUNT_T1, MONEY_END = 25.10, 25.95, 29.3
text_punch(FRONT, big("VENDE MAIS DE", 92, "white"), 24.3, 25.1, 540, 1280, start_scale=0.4, sound="pop")
flash(COUNT_T0); shake(COUNT_T0); sfx("impact", COUNT_T0); sfx("cash", COUNT_T1)
_count_cache = {}
def draw_counter(fr, t):
    e = env(t, COUNT_T0, MONEY_END, 0.15, 0.25)
    if not e: return
    p, q = e
    v = int(round(40 * ease_out((t - COUNT_T0) / (COUNT_T1 - COUNT_T0))))
    key = f"R$ {v}.000" if v else "R$ 0"
    if key not in _count_cache:
        spr = text_sprite(key, font(BLACK, 230), YEL, stroke=12, stroke_fill=INK)
        _count_cache[key] = fit(shadowed(spr, blur=26, off=(0, 0), alpha=255, pad=50, color=(255, 170, 0)), 1060)
    pulse = 1 + 0.10 * math.sin(min(max((t - COUNT_T1) / 0.25, 0), 1) * math.pi)
    place(fr, _count_cache[key], 540, 200, (0.6 + 0.4 * p) * pulse * (1 - 0.2 * q), 1 - q)
BEHIND.append(draw_counter)
text_punch(FRONT, big("POR MÊS", 190, "white"), 26.9, MONEY_END, 540, 1260, start_scale=2.0, sound="impact")

# money burst + rain
MONEY = [emoji(c, s) for c in "💸💵💰" for s in (90, 120, 150)]
PARTS = []
for i in range(26):
    PARTS.append(dict(spr=random.choice(MONEY), t0=COUNT_T1 + random.uniform(0, 0.25), x=540 + random.uniform(-120, 120),
                      y=260, vx=random.uniform(-760, 760), vy=random.uniform(-1500, -700),
                      rot=random.uniform(-40, 40), vr=random.uniform(-260, 260)))
for i in range(16):
    PARTS.append(dict(spr=random.choice(MONEY), t0=26.4 + random.uniform(0, 2.2), x=random.uniform(60, 1020),
                      y=-120, vx=random.uniform(-60, 60), vy=random.uniform(250, 450), rot=random.uniform(-40, 40),
                      vr=random.uniform(-120, 120)))
def draw_money(fr, t):
    if not (COUNT_T1 <= t <= MONEY_END + 0.6): return
    fade = 1 - ease_out((t - MONEY_END) / 0.5) if t > MONEY_END else 1
    for pt in PARTS:
        dt = t - pt["t0"]
        if dt < 0: continue
        g = 2200 if pt["y"] > 0 else 120
        x = pt["x"] + pt["vx"] * dt; y = pt["y"] + pt["vy"] * dt + 0.5 * g * dt * dt
        if y > H + 150: continue
        place(fr, pt["spr"], x, y, 1, fade, pt["rot"] + pt["vr"] * dt)
FRONT.append(draw_money)
icon_pop(FRONT, emoji("🔥", 150), 27.0, 29.2, 150, 1100, sound=None)
icon_pop(FRONT, emoji("🤑", 150), 27.2, 29.2, 930, 1100, sound=None, rot0=18)

# "um produto TRADICIONAL em tantas CASAS do NORTE"
text_punch(BEHIND, big("TRADICIONAL", 200, "ink"), 30.15, 31.9, 540, 230, start_scale=1.4)
for i, (x, t0) in enumerate([(280, 31.1), (540, 31.25), (800, 31.4)]):
    icon_pop(FRONT, emoji("🏠", 150), t0, 31.95, x, 1300, sound="pop" if i == 0 else None)

# "mas O PULO DO GATO não está no produto"
text_punch(FRONT, big("O PULO", 120, "white"), 32.6, 34.0, 540, 1240, start_scale=0.3, sound="pop")
text_punch(FRONT, big("DO GATO", 210, "yellow"), 33.15, 34.0, 540, 1400, start_scale=2.0, sound="impact")
cat = emoji("🐈", 230)
def draw_cat(fr, t, t0=32.75, t1=33.85):
    if not (t0 <= t <= t1): return
    u = (t - t0) / (t1 - t0)
    x = 1000 - 920 * u
    y = 820 - 620 * math.sin(math.pi * u)
    for k in range(4, 0, -1):    # motion trail
        uu = max(0, u - k * 0.035)
        place(fr, cat, 1000 - 920 * uu, 820 - 620 * math.sin(math.pi * uu), 0.9, 0.12 * (5 - k), -30 + 60 * uu)
    place(fr, cat, x, y, 1, 1, -30 + 60 * u)
FRONT.append(draw_cat); sfx("whoosh", 32.7, 1.2)
text_punch(BEHIND, big("PRODUTO", 230, "outline"), 34.3, 35.05, 540, 230, start_scale=1.3, sound=None)
icon_pop(FRONT, emoji("❌", 130), 34.5, 35.05, 900, 900)

# "mas nas ESTRATÉGIAS ..."
marquee(BEHIND, big("ESTRATÉGIA • ESTRATÉGIA •", 200, "yellow", maxw=99999), 35.35, 38.5, 240, speed=650)
icon_pop(FRONT, emoji("🎯", 170), 35.55, 38.5, 880, 900)
icon_pop(FRONT, emoji("🧠", 160), 35.9, 38.5, 200, 900, rot0=18)
icon_pop(FRONT, IG_S, 37.9, 39.5, 330, 1300)
icon_pop(FRONT, WA_S, 38.8, 39.5, 750, 1300, rot0=18)

# "acompanhe aí o processo de CRESCIMENTO" - chart drawing behind him
CH = [(70, 900), (230, 800), (360, 850), (520, 640), (650, 700), (820, 430), (1010, 230)]
def draw_chart(fr, t, t0=40.45, t1=43.4):
    if t < t0: return
    s = ease_in_out((t - t0) / 1.4)
    segs = list(zip(CH, CH[1:])); n = len(segs)
    d = ImageDraw.Draw(fr)
    pts = [CH[0]]
    for i, (a, b) in enumerate(segs):
        u = min(max(s * n - i, 0), 1)
        if u <= 0: break
        pts.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
    if len(pts) > 1:
        d.line(pts, fill=INK + (255,), width=34, joint="curve")
        d.line(pts, fill=GREEN + (255,), width=20, joint="curve")
        ex, ey = pts[-1]
        d.ellipse((ex - 22, ey - 22, ex + 22, ey + 22), fill=YEL + (255,), outline=INK, width=6)
BEHIND.append(draw_chart); sfx("rise", 40.45)
text_punch(FRONT, big("CRESCIMENTO", 170, "yellow"), 41.3, 43.4, 540, 1240, start_scale=0.3, sound="impact")
icon_pop(FRONT, emoji("🚀", 170), 41.5, 43.4, 900, 260)

# ---------------- hook card (covers the burned-in text until it disappears) ----------------
CARD_CX, CARD_CY = 540, 1400
card = shadowed(rounded(980, 470, 44, INK + (255,)))
accent = rounded(140, 12, 6, YEL + (255,))
l1 = text_sprite("EU FATURO", font(XBOLD, 56), WHITE, tracking=8)
money = {v: text_sprite(f"R$ {v} MIL", font(BLACK, 150), YEL) for v in range(0, 41)}
l3 = text_sprite("POR MÊS VENDENDO", font(XBOLD, 60), WHITE)
far = text_sprite("FARINHA", font(BLACK, 60), INK)
far_pill = rounded(far.width + 36, far.height + 26, 14, YEL + (255,)); far_pill.alpha_composite(far, (18, 13))
net = text_sprite("NA INTERNET", font(XBOLD, 60), WHITE)

def draw_hook(fr, t):
    if t > HOOK_END + 0.35: return
    out = ease_out((t - HOOK_END) / 0.3) if t > HOOK_END else 0
    k, a = 1 - 0.25 * out, 1 - out
    place(fr, card, CARD_CX, CARD_CY, k, a)
    def rel(x, y): return CARD_CX + (x - CARD_CX) * k, CARD_CY + (y - CARD_CY) * k
    def item(spr, x, y, t0, dy=40):
        p = ease_out((t - t0) / 0.35); cx, cy = rel(x, y + dy * (1 - p)); place(fr, spr, cx, cy, k, a * p)
    item(accent, 540, 1205, -1, 0); item(l1, 540, 1250, -1)
    v = int(round(40 * ease_out(t / 0.9)))
    pop = 1 + 0.12 * math.sin(min(max((t - 0.9) / 0.3, 0), 1) * math.pi)
    cx, cy = rel(540, 1365); place(fr, money[v], cx, cy, k * pop, a)
    item(l3, 540, 1480, 0.9)
    gap = 18; total = far_pill.width + gap + net.width; x0 = 540 - total / 2
    pp = back_out((t - 1.15) / 0.4)
    cx, cy = rel(x0 + far_pill.width / 2, 1565)
    place(fr, far_pill, cx, cy, k * max(pp, 0), a * min(1, max(0, (t - 1.15) / 0.15)))
    item(net, x0 + far_pill.width + gap + net.width / 2, 1565, 1.3, 0)
sfx("cash", 0.9, 0.7)

# ---------------- name tag ----------------
tag_name = text_sprite("ROBERTO", font(BLACK, 54), INK)
tag_biz = text_sprite("SABORES DO MEU MARANHÃO", font(XBOLD, 36), WHITE)
tag = Image.new("RGBA", (max(tag_name.width, tag_biz.width) + 70, 150), (0, 0, 0, 0))
tag.alpha_composite(rounded(tag_name.width + 40, 66, 14, YEL + (255,)), (0, 0))
tag.alpha_composite(tag_name, (20, (66 - tag_name.height) // 2))
tag.alpha_composite(rounded(tag_biz.width + 40, 54, 14, INK + (235,)), (0, 76))
tag.alpha_composite(tag_biz, (20, 76 + (54 - tag_biz.height) // 2))
tag = shadowed(tag, blur=10, off=(0, 5), alpha=140, pad=20)
def draw_tag(fr, t, t_in=0.5, t_out=3.7):
    if not (t_in <= t < t_out + 0.4): return
    p = ease_out((t - t_in) / 0.4) * (1 - ease_out((t - t_out) / 0.35))
    place(fr, tag, 60 + tag.width / 2 - 120 * (1 - p), 330, 1, p)
sfx("swipe", 0.45, 0.7)

# ---------------- CTA ----------------
cta_txt = text_sprite("SEGUIR", font(BLACK, 66), INK)
plus = Image.new("RGBA", (56, 56), (0, 0, 0, 0)); pd = ImageDraw.Draw(plus)
pd.rounded_rectangle((22, 0, 34, 55), 6, fill=INK); pd.rounded_rectangle((0, 22, 55, 34), 6, fill=INK)
pill = rounded(cta_txt.width + plus.width + 130, 132, 66, (255, 255, 255, 255))
pill.alpha_composite(plus, (52, 38)); pill.alpha_composite(cta_txt, (52 + 56 + 26, (132 - cta_txt.height) // 2))
pill = shadowed(pill)
CTA_T = 41.9
def draw_cta(fr, t):
    if t < CTA_T: return
    p = back_out((t - CTA_T) / 0.45)
    pulse = 1 + 0.05 * math.sin((t - CTA_T) * 2 * math.pi * 1.4) * (t > CTA_T + 0.6)
    place(fr, pill, 540, 1440, max(p, 0) * pulse, min(1, (t - CTA_T) / 0.15))
sfx("pop", CTA_T)

# ---------------- captions (hidden while kinetic text says the same thing) ----------------
CAP_OFF = [(7.15, 9.0), (12.0, 14.4), (14.6, 16.7), (24.3, 27.6), (32.5, 34.05), (41.3, 43.5)]
CAP_FONT = font(BLACK, 66)
KEYWORDS = {"ROBERTO", "SABORES", "MARANHÃO", "COMMODITY", "FARINHA", "MANDIOCA", "INSTAGRAM",
            "WHATSAPP", "VAREJO", "40", "MIL", "REAIS", "PULO", "GATO", "ESTRATÉGIAS", "CRESCIMENTO"}
def cap_word(w): return re.sub(r"[,.?!]", "", w).upper()
def build_chunks(words, max_words=3, max_chars=16):
    chunks, cur = [], []
    for w in words:
        txt = cap_word(w["w"])
        if cur and (len(cur) >= max_words or sum(len(c["t"]) + 1 for c in cur) + len(txt) > max_chars
                    or w["s"] - cur[-1]["e"] > 0.25):
            chunks.append(cur); cur = []
        cur.append({"t": txt, "s": w["s"], "e": w["e"]})
        if re.search(r"[,.?!]$", w["w"]): chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    out = []
    for i, c in enumerate(chunks):
        nxt = chunks[i + 1][0]["s"] if i + 1 < len(chunks) else DUR
        out.append({"words": c, "s": c[0]["s"], "e": min(nxt, c[-1]["e"] + 0.35)})
    return out
def word_sprites(txt):
    kw = txt in KEYWORDS
    normal = shadowed(text_sprite(txt, CAP_FONT, YEL if kw else WHITE, stroke=7, stroke_fill=INK), blur=8, off=(0, 5), alpha=170, pad=20)
    inner = text_sprite(txt, CAP_FONT, INK)
    box = rounded(inner.width + 30, inner.height + 26, 16, (YEL if kw else WHITE) + (255,)); box.alpha_composite(inner, (15, 13))
    return normal, shadowed(box, blur=8, off=(0, 5), alpha=170, pad=20)
CHUNKS = build_chunks(WORDS)
for c in CHUNKS:
    for w in c["words"]: w["n"], w["a"] = word_sprites(w["t"])
def draw_captions(fr, t):
    if any(a <= t < b for a, b in CAP_OFF): return
    y = 1080 if t < HOOK_END + 0.3 else 1560
    for c in CHUNKS:
        if not (c["s"] <= t < c["e"]): continue
        ws = c["words"]; gap = -18
        total = sum(w["n"].width for w in ws) + gap * (len(ws) - 1)
        k0 = min(1.0, 1000 / total); pop = 0.82 + 0.18 * back_out((t - c["s"]) / 0.18)
        x = 540 - total * k0 * pop / 2
        for w in ws:
            active = w["s"] <= t < w["e"] + 0.05 or (w is ws[-1] and t >= w["s"])
            wn = w["n"].width * k0 * pop
            place(fr, w["a"] if active else w["n"], x + wn / 2, y, k0 * pop * (1.06 if active else 1.0))
            x += wn + gap * k0 * pop

def draw_progress(fr, t):
    d = ImageDraw.Draw(fr)
    d.rectangle((0, 0, W, 10), fill=(0, 0, 0, 90)); d.rectangle((0, 0, int(W * t / DUR), 10), fill=YEL + (255,))

def zoom_at(t):
    if t < PHRASES[0]: return 1.0
    i = max(j for j, s in enumerate(PHRASES) if s <= t)
    end = PHRASES[i + 1] if i + 1 < len(PHRASES) else DUR
    return PUNCH.get(PHRASES[i], ZOOMS[i % len(ZOOMS)]) + 0.025 * (t - PHRASES[i]) / (end - PHRASES[i])

# ---------------- sound effects ----------------
SR = 48000
def _env(n, a, r):
    e = np.ones(n); ai = int(a * SR); e[:ai] = np.linspace(0, 1, ai); e *= np.exp(-np.linspace(0, r, n)); return e
def snd(kind):
    rng = np.random.default_rng(len(kind))
    if kind in ("whoosh", "swipe", "rise"):
        dur = {"whoosh": 0.45, "swipe": 0.25, "rise": 1.3}[kind]
        n = int(dur * SR); x = rng.standard_normal(n)
        cut = np.linspace(0.02, 0.35, n) if kind != "swipe" else np.linspace(0.35, 0.05, n)
        y = np.zeros(n); acc = 0.0
        for i in range(n): acc += cut[i] * (x[i] - acc); y[i] = acc
        e = np.sin(np.linspace(0, math.pi, n)) ** (1.6 if kind != "rise" else 0.8)
        y = y * e
        if kind == "rise":
            tt = np.arange(n) / SR; y = 0.5 * y + 0.25 * np.sin(2 * math.pi * (200 * tt + 260 * tt * tt)) * e
        return 0.55 * y / (np.abs(y).max() + 1e-9)
    if kind == "pop":
        n = int(0.12 * SR); tt = np.arange(n) / SR
        return 0.45 * np.sin(2 * math.pi * (900 * tt - 2400 * tt * tt)) * _env(n, 0.003, 9)
    if kind == "impact":
        n = int(0.7 * SR); tt = np.arange(n) / SR
        body = np.sin(2 * math.pi * (70 * tt - 25 * tt * tt)) * _env(n, 0.002, 7)
        click = rng.standard_normal(n) * _env(n, 0.001, 60)
        return 0.8 * body + 0.25 * click
    if kind == "cash":
        n = int(1.0 * SR); tt = np.arange(n) / SR
        y = sum(a * np.sin(2 * math.pi * f * tt) for f, a in [(1568, .5), (2093, .35), (3136, .2), (4186, .1)]) * _env(n, 0.002, 6)
        y[: int(0.06 * SR)] += 0.4 * rng.standard_normal(int(0.06 * SR)) * np.linspace(1, 0, int(0.06 * SR))
        return 0.5 * y
def build_sfx():
    track = np.zeros(int((DUR + 1.5) * SR))
    cache = {}
    for kind, t, gain in SFX:
        if kind not in cache: cache[kind] = snd(kind)
        s = cache[kind]; i = max(0, int(t * SR)); j = min(len(track), i + len(s))
        track[i:j] += gain * s[: j - i]
    track = np.clip(track * 0.6, -1, 1)
    (track * 32767).astype(np.int16).tofile(SFX_WAV + ".raw")
build_sfx()

# ---------------- render ----------------
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-t", str(DUR), "-vf",
    "scale=1080:1920:flags=lanczos,eq=contrast=1.07:saturation=1.18:gamma=0.97,"
    "colorbalance=rm=0.03:bm=-0.04:rh=0.02:bh=-0.02,unsharp=5:5:0.55,vignette=angle=PI/7",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
    "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", SRC,
    "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", SFX_WAV + ".raw",
    "-filter_complex", "[1:a]highpass=f=80,loudnorm=I=-15:TP=-2:LRA=9,aresample=48000[v];"
                       "[2:a]aformat=channel_layouts=stereo,volume=0.55[s];"
                       "[v][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.9[a]",
    "-map", "0:v", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", OUT], stdin=subprocess.PIPE)

LUT = [int(255 * min(1, max(0, (v / 255 - 0.3) / 0.4))) for v in range(256)]   # tighten soft mask edges
fs = W * H * 3; n = 0
while True:
    buf = dec.stdout.read(fs)
    if len(buf) < fs: break
    t = n / FPS
    img = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1)
    z = zoom_at(t)
    dx, dy = shake_offset(t)
    if dx or dy: z = max(z, 1.05)
    cw, ch = W / z, H / z
    x0 = min(max((W - cw) * 0.5 + dx, 0), W - cw); y0 = min(max((H - ch) * 0.25 + dy, 0), H - ch)
    box = (x0, y0, x0 + cw, y0 + ch)
    if z > 1.0005: img = img.resize((W, H), Image.BICUBIC, box=box)
    fr = img.convert("RGBA")
    if any(True for _ in BEHIND):
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for f_ in BEHIND: f_(layer, t)
        if layer.getbbox():
            m = Image.fromarray(MASK[min(n, len(MASK) - 1)]).point(LUT)
            m = m.resize((W, H), Image.BILINEAR, box=tuple(v / 3 for v in box))
            inv = Image.eval(m, lambda v: 255 - v)
            la = layer.split()[3]
            layer.putalpha(Image.fromarray((np.asarray(la, np.uint16) * np.asarray(inv, np.uint16) // 255).astype(np.uint8)))
            fr.alpha_composite(layer)
    draw_hook(fr, 2.0 if n == 0 else t)
    draw_tag(fr, t)
    for f_ in FRONT: f_(fr, t)
    draw_captions(fr, t)
    draw_cta(fr, t)
    draw_progress(fr, t)
    enc.stdin.write(fr.convert("RGB").tobytes())
    n += 1
    if n % 150 == 0: print(f"{t:.1f}s", flush=True)
enc.stdin.close(); enc.wait(); dec.wait()
print("frames", n, "rc", enc.returncode)
