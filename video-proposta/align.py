"""Word timings from the TurboScribe transcript: each phrase is pinned to the speech
segments detected in the audio (pauses between them), and words inside a segment are
spread by syllable count."""
import json, re, sys

# (speech segments [start, end], text) — segment boundaries come from the audio envelope,
# phrase-to-segment mapping is checked against TurboScribe's timestamps.
GROUPS = [
    ([(0.00, 5.16)], "Meu nome é Roberto e eu sou criador aqui das Sabores do Meu Maranhão. O que nós vendemos aqui?"),
    ([(5.32, 6.62)], "Nós vendemos uma commodity,"),
    ([(7.28, 8.82)], "farinha de mandioca,"),
    ([(9.48, 13.38), (13.54, 14.30)], "utilizando apenas Instagram e WhatsApp para vender para os nossos consumidores finais."),
    ([(14.70, 16.60)], "Não é atacado, é varejo, tá?"),
    ([(17.00, 20.68)], "Sem depender de loja aberta, sem depender de pessoas passando na rua."),
    ([(21.06, 21.92)], "Só utilizando"),
    ([(22.14, 23.50)], "Instagram e WhatsApp,"),
    ([(23.76, 25.86)], "a gente vende mais de 40 mil"),
    ([(26.02, 26.46)], "reais"),
    ([(26.96, 29.30)], "por mês de farinha de mandioca."),
    ([(29.50, 31.84)], "Um produto tão tradicional em tantas casas do Norte."),
    ([(32.42, 36.26)], "Mas o pulo do gato não está no produto, mas nas estratégias"),
    ([(36.64, 38.36)], "que a gente usa para vender no Instagram"),
    ([(38.62, 39.46)], "e no WhatsApp."),
    ([(39.88, 40.92), (41.14, 42.26), (42.48, 43.30)], "Acompanhe aí o processo de crescimento aqui das Sabores do Meu Maranhão."),
]
SYL_OVERRIDE = {"40": 3, "whatsapp": 2, "instagram": 3, "commodity": 4, "aí": 2, "tá": 1,
                "reais": 2, "mandioca": 4, "estratégias": 5, "criador": 3}

def syllables(w):
    k = re.sub(r"[^\wà-ú]", "", w.lower())
    if k in SYL_OVERRIDE: return SYL_OVERRIDE[k]
    k = re.sub(r"(ão|õe|ãe|ai|ei|oi|ou|eu|au|ui|iu)", "a", k)
    return max(1, len(re.findall(r"[aeiouáéíóúâêôãõ]+", k)))

out = []
for segs, text in GROUPS:
    words = text.split()
    weights = [syllables(w) + 0.35 for w in words]   # small per-word overhead
    total_speech = sum(e - s for s, e in segs)
    per = total_speech / sum(weights)
    # walk a "speech clock" across the segments, skipping the pauses between them
    def to_time(x):
        for s, e in segs:
            if x <= e - s + 1e-9: return s + x
            x -= e - s
        return segs[-1][1]
    acc = 0.0
    for w, wt in zip(words, weights):
        st, en = to_time(acc), to_time(acc + wt * per)
        out.append({"w": w, "s": round(st, 3), "e": round(en, 3)})
        acc += wt * per
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=0)
for o in out: print(f"{o['s']:6.2f} {o['e']:6.2f} {o['w']}")
