from io import BytesIO
from pathlib import Path
import base64

from PIL import Image, ImageDraw

src = Path(
    r'C:\Users\JOSHUA\.cursor\projects\c-Users-JOSHUA-Documents-PaginaWebMaribel-PaginaWeb\assets\c__Users_JOSHUA_AppData_Roaming_Cursor_User_workspaceStorage_b076c235abac35f177b9f500f7d98056_images_image-c18edd73-ffc1-41b7-88cd-05c8b55e6e2e.png'
)
public = Path(__file__).resolve().parents[1] / 'public'
assets = Path(__file__).resolve().parents[1] / 'src' / 'assets'
assets.mkdir(parents=True, exist_ok=True)

CREMA = (245, 240, 232, 255)
BLANCO = (255, 255, 255, 255)
UMBRAL_TINTA = 170
UMBRAL_FONDO = 242
MIN_TINTA_POR_EJE = 8

im = Image.open(src).convert('RGBA')
w, h = im.size
px = im.load()

cols = [0] * w
rows = [0] * h
for y in range(h):
    for x in range(w):
        r, g, b, _a = px[x, y]
        if r < UMBRAL_TINTA or g < UMBRAL_TINTA or b < UMBRAL_TINTA:
            cols[x] += 1
            rows[y] += 1

minx = next(x for x, n in enumerate(cols) if n >= MIN_TINTA_POR_EJE)
maxx = next(x for x in range(w - 1, -1, -1) if cols[x] >= MIN_TINTA_POR_EJE)
miny = next(y for y, n in enumerate(rows) if n >= MIN_TINTA_POR_EJE)
maxy = next(y for y in range(h - 1, -1, -1) if rows[y] >= MIN_TINTA_POR_EJE)

pad_x = int((maxx - minx) * 0.06)
pad_y = int((maxy - miny) * 0.08)
minx = max(0, minx - pad_x)
miny = max(0, miny - pad_y)
maxx = min(w - 1, maxx + pad_x)
maxy = min(h - 1, maxy + pad_y)
crop = im.crop((minx, miny, maxx + 1, maxy + 1))
print('crop', crop.size, 'from', minx, miny, maxx, maxy)

def limpiar_fondo(img: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    out = img.copy()
    lp = out.load()
    cw, ch = out.size
    for y in range(ch):
        for x in range(cw):
            r, g, b, _a = lp[x, y]
            luma = (r + g + b) / 3
            if luma >= 250:
                lp[x, y] = color
            elif luma >= UMBRAL_FONDO:
                t = (250 - luma) / (250 - UMBRAL_FONDO)
                lp[x, y] = (
                    int(color[0] + (r - color[0]) * t),
                    int(color[1] + (g - color[1]) * t),
                    int(color[2] + (b - color[2]) * t),
                    255,
                )
    return out


limpio_blanco = limpiar_fondo(crop, BLANCO)
limpio_crema = limpiar_fondo(crop, CREMA)


def colocar(marca: Image.Image, lado: int, fondo: tuple[int, int, int, int], margen: float) -> Image.Image:
    canvas = Image.new('RGBA', (lado, lado), fondo)
    usable = int(lado * (1 - 2 * margen))
    mw, mh = marca.size
    escala = min(usable / mw, usable / mh)
    nw = max(1, int(mw * escala))
    nh = max(1, int(mh * escala))
    resized = marca.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (lado - nw) // 2
    y = (lado - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def redondear(img: Image.Image, radio_ratio: float = 0.275) -> Image.Image:
    lado = img.size[0]
    radio = int(lado * radio_ratio)
    mascara = Image.new('L', (lado, lado), 0)
    draw = ImageDraw.Draw(mascara)
    draw.rounded_rectangle((0, 0, lado - 1, lado - 1), radius=radio, fill=255)
    out = img.copy()
    out.putalpha(mascara)
    base = Image.new('RGBA', (lado, lado), CREMA)
    base.paste(out, (0, 0), out)
    base.putalpha(mascara)
    return base


def opaco(img: Image.Image, color: tuple[int, int, int, int] = CREMA) -> Image.Image:
    fondo = Image.new('RGBA', img.size, color)
    fondo.paste(img, (0, 0), img)
    return fondo.convert('RGB')


def a_transparente(img: Image.Image) -> Image.Image:
    out = img.convert('RGBA')
    px = out.load()
    cw, ch = out.size
    for y in range(ch):
        for x in range(cw):
            r, g, b, _a = px[x, y]
            luma = (r + g + b) / 3
            if luma >= 250:
                px[x, y] = (r, g, b, 0)
            elif luma >= UMBRAL_FONDO:
                t = (250 - luma) / (250 - UMBRAL_FONDO)
                px[x, y] = (r, g, b, max(0, min(255, int(255 * t))))
    return out


completo_png = a_transparente(crop)
completo_png.save(assets / 'logo-completo.png', 'PNG', optimize=True)
completo_png.save(public / 'logo-completo.png', 'PNG', optimize=True)

icono_1024 = opaco(colocar(limpio_crema, 1024, CREMA, 0.08), CREMA)
icono_1024.save(assets / 'logo-marca.png', 'PNG', optimize=True)
icono_1024.save(public / 'logo-marca.png', 'PNG', optimize=True)

pwa_512 = opaco(redondear(colocar(limpio_crema, 512, CREMA, 0.10)), CREMA)
pwa_192 = opaco(redondear(colocar(limpio_crema, 192, CREMA, 0.10)), CREMA)
pwa_512.save(public / 'pwa-512x512.png', 'PNG', optimize=True)
pwa_192.save(public / 'pwa-192x192.png', 'PNG', optimize=True)

maskable = opaco(colocar(limpio_crema, 512, CREMA, 0.20), CREMA)
maskable.save(public / 'pwa-512x512-maskable.png', 'PNG', optimize=True)

apple = opaco(redondear(colocar(limpio_crema, 180, CREMA, 0.10)), CREMA)
apple.save(public / 'apple-touch-icon.png', 'PNG', optimize=True)

fav32 = opaco(redondear(colocar(limpio_crema, 32, CREMA, 0.08)), CREMA)
fav32.save(public / 'favicon-32.png', 'PNG', optimize=True)


def svg_con_png(img: Image.Image, lado: int, destino: Path) -> None:
    buf = BytesIO()
    img.save(buf, 'PNG', optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    destino.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lado} {lado}">\n'
        f'  <image href="data:image/png;base64,{b64}" width="{lado}" height="{lado}"/>\n'
        f'</svg>\n',
        encoding='utf-8',
    )


svg_con_png(opaco(redondear(colocar(limpio_crema, 256, CREMA, 0.10)), CREMA), 256, public / 'favicon.svg')
svg_con_png(pwa_512, 512, public / 'logo.svg')

print('saved')
for p in [
    assets / 'logo-completo.png',
    assets / 'logo-marca.png',
    public / 'logo-completo.png',
    public / 'logo-marca.png',
    public / 'pwa-512x512.png',
    public / 'pwa-192x192.png',
    public / 'pwa-512x512-maskable.png',
    public / 'apple-touch-icon.png',
    public / 'favicon-32.png',
    public / 'favicon.svg',
    public / 'logo.svg',
]:
    print(p.name, p.stat().st_size)
