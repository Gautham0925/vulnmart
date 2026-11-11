import os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

PALETTES = [
    ("#4f46e5", "#312e81", "#c7d2fe", "#eef2ff"),
    ("#0ea5e9", "#075985", "#bae6fd", "#f0f9ff"),
    ("#10b981", "#065f46", "#a7f3d0", "#ecfdf5"),
    ("#f59e0b", "#92400e", "#fde68a", "#fffbeb"),
    ("#ec4899", "#9d174d", "#fbcfe8", "#fdf2f8"),
]
INK = "#0f172a"
STEEL = "#cbd5e1"
WHITE = "#ffffff"

def rr(x, y, w, h, r, fill, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" {extra}/>'

def ell(cx, cy, rx, ry, fill, extra=""):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'

def circ(cx, cy, r, fill, extra=""):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" {extra}/>'

def path(d, fill, extra=""):
    return f'<path d="{d}" fill="{fill}" {extra}/>'

def K(name):
    def deco(fn):
        KINDS[name] = fn
        return fn
    return deco

KINDS = {}

@K("headphones")
def _(c, d, l):
    return (path("M130 270 C130 150 190 100 240 100 C290 100 350 150 350 270", "none", f'stroke="{d}" stroke-width="22" stroke-linecap="round"')
            + rr(104, 245, 58, 104, 26, c) + rr(318, 245, 58, 104, 26, c)
            + rr(116, 262, 22, 70, 11, l) + rr(342, 262, 22, 70, 11, l))

@K("laptop")
def _(c, d, l):
    return (rr(120, 130, 240, 160, 12, INK) + rr(130, 140, 220, 140, 6, l)
            + path("M150 250 L210 190 L250 230 L290 200 L330 250 Z", c, 'opacity=".85"')
            + path("M92 300 H388 L370 330 H110 Z", d) + rr(214, 306, 52, 6, 3, STEEL))

@K("speaker")
def _(c, d, l):
    return (rr(165, 140, 150, 210, 40, c) + circ(240, 205, 38, d) + circ(240, 205, 20, l)
            + circ(240, 300, 24, d) + circ(240, 300, 11, l) + rr(215, 158, 50, 8, 4, l))

@K("camera")
def _(c, d, l):
    return (rr(120, 170, 240, 160, 24, d) + rr(190, 148, 70, 30, 10, c) + circ(240, 250, 58, INK) + circ(240, 250, 42, c)
            + circ(240, 250, 22, l) + circ(330, 198, 8, l) + rr(136, 190, 38, 12, 6, l))

@K("watch")
def _(c, d, l):
    return (rr(205, 80, 70, 100, 12, d) + rr(205, 300, 70, 100, 12, d) + rr(170, 170, 140, 140, 36, INK)
            + rr(182, 182, 116, 116, 26, l) + path("M240 205 V245 L268 262", "none", f'stroke="{INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"')
            + rr(306, 224, 10, 28, 4, c))

@K("keyboard")
def _(c, d, l):
    keys = ""
    for r in range(4):
        for k in range(10):
            keys += rr(112 + k * 26, 190 + r * 30, 22, 24, 5, l if (r + k) % 7 else c)
    return rr(96, 170, 288, 148, 18, d) + keys

@K("phone")
def _(c, d, l):
    return (rr(168, 84, 144, 292, 30, INK) + rr(178, 98, 124, 264, 20, l)
            + path("M178 300 L230 220 L262 270 L286 244 L302 300 V342 Q302 362 282 362 H198 Q178 362 178 342 Z", c, 'opacity=".9"')
            + circ(240, 120, 6, INK) + rr(216, 348, 48, 5, 2.5, d))

@K("tablet")
def _(c, d, l):
    return (rr(110, 120, 260, 240, 24, INK) + rr(124, 134, 232, 212, 12, l)
            + circ(210, 215, 34, c) + rr(262, 190, 70, 14, 7, d) + rr(262, 214, 54, 10, 5, c) + rr(150, 280, 180, 12, 6, d))

@K("charger")
def _(c, d, l):
    return (rr(180, 130, 120, 150, 22, c) + rr(212, 100, 14, 36, 4, STEEL) + rr(254, 100, 14, 36, 4, STEEL)
            + rr(200, 198, 80, 14, 7, d) + rr(200, 224, 80, 14, 7, l) + path("M240 280 C240 340 300 330 300 380", "none", f'stroke="{d}" stroke-width="10" stroke-linecap="round"'))

@K("case")
def _(c, d, l):
    return (rr(170, 100, 140, 270, 26, l, f'stroke="{c}" stroke-width="8"') + path("M190 150 L290 320", "none", f'stroke="{WHITE}" stroke-width="12" stroke-linecap="round" opacity=".8"')
            + rr(214, 120, 52, 10, 5, c))

@K("tshirt")
def _(c, d, l):
    return (path("M170 110 L130 140 L100 200 L148 222 L166 196 V370 H314 V196 L332 222 L380 200 L350 140 L310 110 C296 138 184 138 170 110 Z", c)
            + path("M170 110 C184 138 296 138 310 110 C296 160 184 160 170 110 Z", d, 'opacity=".55"'))

@K("sneaker")
def _(c, d, l):
    return (path("M96 300 L110 210 Q150 200 178 160 Q208 190 250 200 L350 232 Q392 244 392 288 V320 H96 Z", c)
            + rr(88, 316, 312, 30, 15, l) + rr(88, 336, 312, 10, 5, d) + path("M178 164 L214 204 M206 190 L246 210 M230 204 L268 218", "none", f'stroke="{WHITE}" stroke-width="7" stroke-linecap="round"')
            + path("M250 262 Q300 238 352 262", "none", f'stroke="{d}" stroke-width="10" stroke-linecap="round"'))

@K("jacket")
def _(c, d, l):
    return (path("M180 110 L120 150 L96 300 L142 312 L160 200 V380 H320 V200 L338 312 L384 300 L360 150 L300 110 L240 150 Z", c)
            + path("M240 150 V380", "none", f'stroke="{d}" stroke-width="8"') + rr(196, 270, 36, 54, 6, d, 'opacity=".5"') + rr(248, 270, 36, 54, 6, d, 'opacity=".5"')
            + path("M180 110 L240 150 L300 110 L270 100 H210 Z", d))

@K("backpack")
def _(c, d, l):
    return (rr(150, 110, 180, 270, 52, c) + rr(180, 230, 120, 100, 20, d) + rr(200, 260, 80, 12, 6, l)
            + path("M200 112 C200 70 280 70 280 112", "none", f'stroke="{d}" stroke-width="14" stroke-linecap="round"') + rr(190, 172, 100, 38, 12, l, 'opacity=".5"'))

@K("pants")
def _(c, d, l):
    return (path("M170 100 H310 L330 380 H262 L240 200 L218 380 H150 Z", c) + rr(170, 100, 140, 26, 6, d) + rr(224, 100, 32, 30, 4, l, 'opacity=".6"'))

@K("wallet")
def _(c, d, l):
    return (rr(110, 160, 260, 180, 22, c) + path("M110 200 H370", "none", f'stroke="{d}" stroke-width="6"')
            + rr(300, 230, 80, 52, 18, d) + circ(326, 256, 8, l) + rr(130, 176, 100, 8, 4, d, 'opacity=".5"'))

@K("kettle")
def _(c, d, l):
    return (path("M160 190 Q160 130 240 130 Q320 130 320 190 V350 H160 Z", c) + rr(150, 350, 180, 22, 8, d)
            + path("M320 180 Q386 190 380 270 Q374 320 320 320", "none", f'stroke="{d}" stroke-width="16" stroke-linecap="round"')
            + path("M160 220 L116 190 L134 176 L172 200", c) + rr(214, 112, 52, 22, 10, d) + rr(186, 220, 22, 100, 11, l, 'opacity=".5"'))

@K("lamp")
def _(c, d, l):
    return (rr(170, 360, 140, 20, 10, d) + path("M240 360 L240 250 L300 160", "none", f'stroke="{d}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"')
            + path("M250 120 L360 156 L330 226 Z", c) + circ(318, 214, 12, l) + path("M300 226 L338 330 L270 330 Z", l, 'opacity=".35"'))

@K("chair")
def _(c, d, l):
    return (rr(170, 90, 140, 170, 36, c) + rr(190, 110, 100, 130, 24, l, 'opacity=".45"') + rr(150, 262, 180, 36, 14, d)
            + rr(232, 298, 16, 60, 6, INK) + path("M170 380 H310", "none", f'stroke="{INK}" stroke-width="12" stroke-linecap="round"')
            + path("M150 280 H128 V230", "none", f'stroke="{d}" stroke-width="12" stroke-linecap="round"') + path("M330 280 H352 V230", "none", f'stroke="{d}" stroke-width="12" stroke-linecap="round"'))

@K("mug")
def _(c, d, l):
    return (rr(150, 150, 170, 190, 34, c) + path("M318 190 Q394 190 394 250 Q394 310 318 310", "none", f'stroke="{c}" stroke-width="22"')
            + rr(164, 164, 142, 28, 14, d, 'opacity=".55"') + path("M200 120 Q190 100 210 84 M244 120 Q234 100 254 84", "none", f'stroke="{STEEL}" stroke-width="8" stroke-linecap="round"'))

@K("blender")
def _(c, d, l):
    return (path("M170 100 H310 L290 290 H190 Z", l, f'opacity=".7" stroke="{c}" stroke-width="6"') + rr(160, 290, 160, 80, 18, c) + circ(240, 330, 16, l)
            + rr(184, 80, 112, 24, 8, d) + path("M205 230 L240 260 L275 230", "none", f'stroke="{d}" stroke-width="8" stroke-linecap="round"'))

@K("blanket")
def _(c, d, l):
    stripes = "".join(rr(108, 150 + i * 36, 264, 18, 4, d if i % 2 else l, 'opacity=".7"') for i in range(6))
    return rr(100, 130, 280, 230, 18, c) + stripes + "".join(rr(100 + i * 24, 360, 10, 26, 3, d) for i in range(11))

@K("book")
def _(c, d, l):
    return (rr(150, 90, 180, 290, 10, c) + rr(150, 90, 22, 290, 6, d) + rr(190, 140, 120, 14, 7, l) + rr(190, 168, 90, 10, 5, l, 'opacity=".7"')
            + circ(250, 280, 36, l, 'opacity=".35"') + rr(150, 366, 180, 14, 4, WHITE))

@K("notebook")
def _(c, d, l):
    dots = "".join(circ(194 + x * 26, 170 + y * 26, 2.4, d, 'opacity=".5"') for x in range(5) for y in range(8))
    return rr(150, 90, 180, 290, 14, c) + rr(166, 110, 150, 250, 8, l) + dots + rr(326, 140, 12, 200, 6, d)

@K("mat")
def _(c, d, l):
    return (path("M110 330 L370 330 L370 280 L110 280 Z", c) + ell(122, 305, 22, 26, d) + ell(122, 305, 10, 13, l) + path("M122 280 L360 280", "none", f'stroke="{l}" stroke-width="5" opacity=".7"')
            + rr(190, 130, 100, 100, 16, l, 'opacity="0"'))

@K("dumbbell")
def _(c, d, l):
    return (rr(130, 205, 220, 22, 10, STEEL) + rr(110, 170, 36, 92, 10, d) + rr(148, 184, 24, 64, 8, c) + rr(334, 170, 36, 92, 10, d) + rr(308, 184, 24, 64, 8, c)
            + rr(210, 200, 60, 32, 8, INK))

@K("bottle")
def _(c, d, l):
    return (rr(200, 80, 80, 46, 12, d) + rr(176, 118, 128, 266, 44, c) + rr(196, 170, 20, 170, 10, l, 'opacity=".5"') + rr(196, 230, 88, 36, 6, l, 'opacity=".25"'))

@K("rope")
def _(c, d, l):
    return (path("M170 100 V230 Q170 370 240 370 Q310 370 310 230 V100", "none", f'stroke="{c}" stroke-width="10" stroke-linecap="round"')
            + rr(158, 96, 28, 110, 12, d) + rr(294, 96, 28, 110, 12, d))

@K("serum")
def _(c, d, l):
    return (rr(204, 74, 72, 52, 10, INK) + rr(228, 56, 24, 22, 6, d) + rr(176, 124, 128, 250, 26, l, f'stroke="{c}" stroke-width="6"')
            + rr(176, 220, 128, 110, 6, c, 'opacity=".25"') + circ(240, 275, 28, c) + path("M240 124 V160", "none", f'stroke="{c}" stroke-width="10"'))

@K("kit")
def _(c, d, l):
    return (rr(110, 170, 260, 190, 18, d) + rr(110, 170, 260, 56, 18, c) + rr(150, 130, 36, 80, 8, l) + rr(200, 110, 34, 100, 8, c) + rr(246, 140, 30, 70, 8, WHITE)
            + rr(150, 262, 180, 14, 7, l, 'opacity=".6"'))

@K("tube")
def _(c, d, l):
    return (path("M180 110 H300 L316 350 H164 Z", c) + rr(172, 350, 136, 36, 8, d) + rr(176, 90, 128, 28, 8, d) + circ(240, 240, 40, l, 'opacity=".5"')
            + path("M220 240 L240 214 L260 240 L240 266 Z", c))

@K("blocks")
def _(c, d, l):
    def blk(x, y, col):
        return rr(x, y, 100, 78, 8, col) + "".join(circ(x + 26 + i * 24, y + 12, 7, WHITE, 'opacity=".5"') for i in range(3))
    return blk(120, 290, c) + blk(240, 290, d) + blk(180, 212, l) + blk(150, 134, c) + blk(250, 212, c)

@K("board")
def _(c, d, l):
    return (path("M100 170 L360 170 L390 340 L130 340 Z", c) + path("M118 186 L352 186 L376 324 L146 324 Z", l, 'opacity=".55"')
            + circ(200, 250, 20, d) + circ(280, 260, 20, INK) + path("M230 210 L260 290", "none", f'stroke="{d}" stroke-width="7" stroke-linecap="round"'))

@K("car")
def _(c, d, l):
    return (path("M96 280 L120 220 Q140 190 180 190 H300 Q340 190 360 224 L388 280 V310 H96 Z", c) + path("M150 222 L186 202 H296 L336 232 Z", l, 'opacity=".8"')
            + circ(160, 318, 34, INK) + circ(160, 318, 16, STEEL) + circ(332, 318, 34, INK) + circ(332, 318, 16, STEEL) + rr(366, 266, 20, 16, 4, l))

@K("box")
def _(c, d, l):
    return (path("M240 110 L370 170 V320 L240 380 L110 320 V170 Z", c) + path("M240 110 L370 170 L240 232 L110 170 Z", l) + path("M240 232 V380", "none", f'stroke="{d}" stroke-width="6"')
            + path("M200 130 L330 190", "none", f'stroke="{d}" stroke-width="18" opacity=".5"'))

def build(kind, variant):
    c, d, l, bg = PALETTES[variant]
    art = KINDS[kind](c, d, l)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" role="img" aria-label="{kind}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{bg}"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0f172a" flood-opacity=".18"/></filter></defs>
<rect width="480" height="480" fill="url(#g)"/>
<ellipse cx="240" cy="396" rx="130" ry="14" fill="#0f172a" opacity=".08"/>
<g filter="url(#s)">{art}</g></svg>'''

for kind in KINDS:
    for v in range(5):
        open(os.path.join(OUT, f"{kind}-{v}.svg"), "w").write(build(kind, v))
print(len(KINDS) * 5, "images")
