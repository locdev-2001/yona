const PNG_SIGNATURE_BYTES = 8;
const CHUNK_OVERHEAD_BYTES = 12;
const PALETTE_ENTRY_BYTES = 3;

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let value = 0; value < 256; value++) {
        let crc = value;
        for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        table[value] = crc >>> 0;
    }

    return table;
})();

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);

    return (crc ^ 0xffffffff) >>> 0;
}

function readChunks(png) {
    const chunks = new Map();
    let offset = PNG_SIGNATURE_BYTES;
    while (offset + CHUNK_OVERHEAD_BYTES <= png.length) {
        const length = png.readUInt32BE(offset);
        const type = png.toString('latin1', offset + 4, offset + 8);
        chunks.set(type, { offset, length });
        offset += length + CHUNK_OVERHEAD_BYTES;
    }

    return chunks;
}

/**
 * Bộ lượng tử hoá bảng màu gán màu tuỳ ý cho ô trong suốt; đặt RGB của mọi ô alpha 0 về 0
 * để kênh nào bỏ qua alpha cũng không lộ màu lạ.
 */
export function zeroTransparentPaletteColors(png) {
    const chunks = readChunks(png);
    const palette = chunks.get('PLTE');
    const transparency = chunks.get('tRNS');
    if (!palette || !transparency) return png;

    const output = Buffer.from(png);
    const paletteDataStart = palette.offset + 8;
    const transparencyDataStart = transparency.offset + 8;
    const entryCount = Math.min(transparency.length, palette.length / PALETTE_ENTRY_BYTES);
    for (let entry = 0; entry < entryCount; entry++) {
        if (output[transparencyDataStart + entry] !== 0) continue;
        output.fill(0, paletteDataStart + entry * PALETTE_ENTRY_BYTES, paletteDataStart + (entry + 1) * PALETTE_ENTRY_BYTES);
    }
    const crcStart = palette.offset + 4;
    output.writeUInt32BE(crc32(output.subarray(crcStart, paletteDataStart + palette.length)), paletteDataStart + palette.length);

    return output;
}
