# ================= TIMELINE (Progredir — Feira de Carreiras do Mundo Senai) =================
IGs, WAs = icon("instagram", 160), icon("whatsapp", 160)

# hook: "Você sabe o que é uma feira de carreiras?" — the two lines stand tall behind her head
TX1, TX2 = tall("FEIRA DE", "blue", maxh=250, stretch=1.6), tall("CARREIRAS?", "ink", maxh=270, stretch=1.6)
blur_in(BEHIND, TX1, 1.3, 2.6, 540, 40 + TX1.height / 2, sound="whoosh")
blur_in(BEHIND, TX2, 1.55, 2.6, 540, 40 + TX1.height + TX2.height / 2 - 10, sound=None)
icon_pop(FRONT, icon("question", 170), 0.5, 2.6, 900, 700)

# "se não, fica nesse vídeo!"
icon_pop(FRONT, icon("eye", 160), 3.3, 4.45, 180, 760)
box_wipe(FRONT, "FICA NESSE VÍDEO!", font(ANTON, 110), ACC, WHITE, 3.85, 4.5, 540, 1420)

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
    ar = text_sprite("⇄", font(MB, 64), ACC2) if False else None
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
FRONT.append(draw_conn); sfx("snap", 6.52); sfx("pop", 7.0, 0.7); sfx("pop", 7.45, 0.7)

# "as empresas apresentam o que fazem e as oportunidades que elas oferecem"
icon_pop(FRONT, icon("building", 170), 8.8, 10.5, 175, 760)
TX = tall("OPORTUNIDADES", "blue"); blur_in(BEHIND, TX, 10.85, 12.45, 540, top(TX, 40))
icon_pop(FRONT, icon("briefcase", 170), 10.9, 12.45, 905, 760, tilt=14)

# "ou seja, você conversa direto com quem pode te proporcionar"
icon_pop(FRONT, icon("chat", 170), 13.85, 15.8, 180, 760)
icon_pop(FRONT, icon("handshake", 170), 14.55, 15.8, 900, 760, tilt=14)
char_reveal(FRONT, "DIRETO COM QUEM DECIDE", font(MB, 70), WHITE, 14.2, 15.8, 540, 1420, stagger=0.02)

# ---------- WOW: "seu primeiro estágio!" (music drops here) ----------
WOW = 15.95
DARKEN.append((15.0, WOW, 0.45))
flash(WOW); shake(WOW); sfx("shutter", WOW - 0.02); sfx("cash", WOW + 0.35, 0.7)
TX = tall("ESTÁGIO", "blue", stretch=1.9); blur_in(BEHIND, TX, WOW, 17.2, 540, top(TX, 30), k0=1.5, sound="impact")
char_reveal(FRONT, "SEU PRIMEIRO", font(ANTON, 120), WHITE, WOW + 0.05, 17.2, 540, 1300, stroke=4, stroke_fill=INK)
box_wipe(FRONT, "ESTÁGIO!", font(ANTON, 230), ACC, WHITE, WOW + 0.35, 17.2, 540, 1500, sound="impact")
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
icon_pop(FRONT, icon("pin", 170), 18.6, 19.6, 905, 760, tilt=14)
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
    place(fr, DATE, 540, 1380, max(0, k), 1 - e[1], -6 * (1 - ease_out((t - t0) / 0.5)))
FRONT.append(draw_date); sfx("impact", 19.9, 0.8)

# "e é claro que a Progredir vai tá marcando presença"
TX = tall("PROGREDIR", "blue"); blur_in(BEHIND, TX, 22.2, 23.62, 540, top(TX, 40))
box_wipe(FRONT, "PRESENÇA CONFIRMADA", font(ANTON, 100), ACC, WHITE, 23.25, 23.62, 540, 1440)
icon_pop(FRONT, icon("check", 150), 23.3, 23.62, 935, 1330)

# "anota aí no seu calendário e venha conversar com a gente" — the calendar prop is in frame
TX = tall("05/11", "orange", stretch=1.9); blur_in(BEHIND, TX, 24.55, 27.6, 540, top(TX, 30), k0=1.4)
icon_pop(FRONT, icon("calendar", 170), 24.65, 27.6, 170, 760)
icon_pop(FRONT, icon("chat", 160), 26.6, 27.6, 910, 760, tilt=14)

# "seu futuro tá te esperando!"
TX = tall("SEU FUTURO", "blue"); blur_in(BEHIND, TX, 27.6, 29.3, 540, top(TX, 40))
char_reveal(FRONT, "TÁ TE ESPERANDO!", font(ANTON, 130), WHITE, 28.25, 29.3, 540, 1420, stroke=5, stroke_fill=INK, stagger=0.025)
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
    at(shadowed(E1, blur=14, off=(0, 8), alpha=150, pad=30), 640, END_T + 0.1)
    at(DATE_SMALL, 1000, END_T + 0.25)
    at(E3, 1330, END_T + 0.45)
DATE_SMALL = scaled(DATE, 0.72)
for tt in (END_T + 0.1, END_T + 0.25): sfx("whoosh", tt - 0.05, 0.7)
MS = None
def draw_ms(fr, t):
    """'MUNDO SENAI' pill on the end card"""
    if t < END_T + 0.18: return
    p = ease_io((t - END_T - 0.18) / 0.3)
    spr = MS_PILL; part = spr.crop((0, 0, max(2, int(spr.width * p)), spr.height))
    place(fr, part, 540 - spr.width / 2 + part.width / 2, 790)
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
        place(fr, pill_a, 540, 1520, max(p, 0), min(1, (t - CTA_T) / 0.15))
    else:
        k = 1 - 0.08 * math.sin(min(1, (t - TAP_T) / 0.18) * math.pi)
        place(fr, pill_b, 540, 1520, k)
        u = (t - TAP_T) / 0.5
        if u < 1:
            r = 30 + 90 * ease_out(u); patch = Image.new("RGBA", (int(2 * r) + 2, int(2 * r) + 2), (0, 0, 0, 0))
            ImageDraw.Draw(patch).ellipse((0, 0, 2 * r, 2 * r), fill=(255, 255, 255, int(90 * (1 - u))))
            place(fr, patch, 650, 1530)
sfx("pop", CTA_T); sfx("tap", TAP_T)

