/* eslint-disable no-console */
// Generates all app icons from public/logo.png (a transparent RGBA PNG).
// Run after replacing the logo:  node scripts/make-icons.js
//
// Outputs (all composited on the dark site background, since the logo is white/pink):
//   app/icon.png                      512  favicon
//   public/icons/icon-192.png         192  manifest icon
//   public/icons/icon-512.png         512  manifest icon
//   public/icons/icon-maskable-512.png 512 manifest maskable icon (extra padding for Android)
//   public/icons/apple-touch-icon.png 180  iPhone home-screen icon

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT    = path.join(__dirname, '..');
const SRC     = path.join(ROOT, 'public', 'logo.png');
const BG      = [11, 11, 13]; // --bg

function decodePng(buf) {
    let p = 8, w = 0, h = 0, colorType = 0;
    const idat = [];
    while (p < buf.length) {
        const len  = buf.readUInt32BE(p);
        const type = buf.slice(p + 4, p + 8).toString();
        if (type === 'IHDR') {
            w = buf.readUInt32BE(p + 8);
            h = buf.readUInt32BE(p + 12);
            colorType = buf[p + 8 + 9];
        }
        if (type === 'IDAT') idat.push(buf.slice(p + 8, p + 8 + len));
        p += 12 + len;
    }
    if (colorType !== 6) throw new Error('logo.png must be an RGBA PNG (8-bit, colour type 6). Re-export with transparency.');
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const bpp = 4, stride = w * bpp;
    const out = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        const f    = raw[y * (stride + 1)];
        const src  = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        const dst  = out.slice(y * stride, (y + 1) * stride);
        const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
        for (let i = 0; i < stride; i++) {
            const a = i >= bpp ? dst[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
            let v = src[i];
            if (f === 1) v += a;
            else if (f === 2) v += b;
            else if (f === 3) v += Math.floor((a + b) / 2);
            else if (f === 4) {
                const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
                v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
            }
            dst[i] = v & 255;
        }
    }
    return { w, h, data: out };
}

function render({ w, h, data }, size, padRatio) {
    const pad = Math.round(size * padRatio), inner = size - 2 * pad, scale = w / inner;
    const img = Buffer.alloc(size * size * 3);
    for (let i = 0; i < size * size; i++) { img[i * 3] = BG[0]; img[i * 3 + 1] = BG[1]; img[i * 3 + 2] = BG[2]; }
    for (let y = 0; y < inner; y++) {
        for (let x = 0; x < inner; x++) {
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            const x0 = Math.floor(x * scale), y0 = Math.floor(y * scale);
            const x1 = Math.max(x0 + 1, Math.floor((x + 1) * scale)), y1 = Math.max(y0 + 1, Math.floor((y + 1) * scale));
            for (let yy = y0; yy < y1 && yy < h; yy++) {
                for (let xx = x0; xx < x1 && xx < w; xx++) {
                    const i = (yy * w + xx) * 4, al = data[i + 3] / 255;
                    r += data[i] * al; g += data[i + 1] * al; b += data[i + 2] * al; a += al; n++;
                }
            }
            const al = a / n, o = ((y + pad) * size + (x + pad)) * 3;
            img[o]     = Math.round(r / n + BG[0] * (1 - al));
            img[o + 1] = Math.round(g / n + BG[1] * (1 - al));
            img[o + 2] = Math.round(b / n + BG[2] * (1 - al));
        }
    }
    return img;
}

const crcTable = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(type), d]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
};

function encodePng(rgb, size) {
    const rows = Buffer.alloc(size * (size * 3 + 1));
    for (let y = 0; y < size; y++) { rows[y * (size * 3 + 1)] = 0; rgb.copy(rows, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3); }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

const logo = decodePng(fs.readFileSync(SRC));
const outputs = [
    ['app/icon.png',                       512, 0.08],
    ['public/icons/icon-192.png',          192, 0.10],
    ['public/icons/icon-512.png',          512, 0.10],
    ['public/icons/icon-maskable-512.png', 512, 0.20],
    ['public/icons/apple-touch-icon.png',  180, 0.12],
];
fs.mkdirSync(path.join(ROOT, 'public', 'icons'), { recursive: true });
for (const [rel, size, pad] of outputs) {
    const png = encodePng(render(logo, size, pad), size);
    fs.writeFileSync(path.join(ROOT, rel), png);
    console.log(`${rel}  ${size}x${size}  ${Math.round(png.length / 1024)} KB`);
}
