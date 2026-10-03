import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addWhiteStroke } from './white-stroke.mjs';
import { parseEdit } from '../edit-options.mjs';

const pixel = (frame, side, x, y) => [...frame.subarray((y * side + x) * 4, (y * side + x + 1) * 4)];

function square(side, alpha = 255) {
    const frame = new Uint8ClampedArray(side * side * 4);
    for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) frame.set([220, 30, 30, alpha], (y * side + x) * 4);
    }
    return frame;
}

test('tắt viền giữ nguyên buffer và kích thước, thiếu trường có mặc định 0', () => {
    const frames = [square(10)];
    assert.deepEqual(addWhiteStroke(frames, 10), { frames, side: 10, padding: 0 });
    assert.equal(parseEdit({}).strokeWidth, 0);
    for (const strokeWidth of [-0.01, 0.081, '0.03', null, NaN, Infinity]) {
        assert.throws(() => parseEdit({ strokeWidth }));
    }
    assert.equal(parseEdit({ strokeWidth: 0.08 }).strokeWidth, 0.08);
});

test('chủ thể chạm cả bốn mép vẫn có viền trắng đủ lề và giữ màu ảnh gốc', () => {
    const source = square(50);
    const { frames: [frame], side, padding } = addWhiteStroke([source], 50, 0.08);
    assert.deepEqual(pixel(frame, side, padding, padding), [220, 30, 30, 255]);
    assert.deepEqual(pixel(frame, side, padding - 1, padding + 25), [255, 255, 255, 255]);
    assert.deepEqual(pixel(frame, side, padding + 50, padding + 25), [255, 255, 255, 255]);
    for (let position = 0; position < side; position++) {
        for (const [x, y] of [[position, 0], [position, side - 1], [0, position], [side - 1, position]]) {
            assert.equal(pixel(frame, side, x, y)[3], 0);
        }
    }
    assert.deepEqual(source, square(50));
});

test('mép viền tròn, làm mịn và trộn trắng dưới điểm bán trong suốt', () => {
    const sourceSide = 30;
    const source = new Uint8ClampedArray(sourceSide * sourceSide * 4);
    source.set([220, 30, 30, 128], (15 * sourceSide + 15) * 4);
    const { frames: [frame], side, padding } = addWhiteStroke([source], sourceSide, 0.08);
    const center = pixel(frame, side, padding + 15, padding + 15);
    assert.deepEqual(center, [237, 142, 142, 255]);
    const edgeAlpha = frame.filter((_, index) => index % 4 === 3 && frame[index] > 0 && frame[index] < 255);
    assert.ok(edgeAlpha.length > 0);
    assert.equal(pixel(frame, side, padding + 19, padding + 19)[3], 0);
});

test('ảnh rỗng không sinh viền và các khung dùng cùng lề, không trộn lẫn', () => {
    const blank = new Uint8ClampedArray(20 * 20 * 4);
    const source = new Uint8ClampedArray(blank.length);
    source.set([30, 60, 200, 255], (10 * 20 + 10) * 4);
    const { frames, side, padding } = addWhiteStroke([blank, source, blank], 20, 0.03);
    assert.ok(frames[0].every(value => value === 0));
    assert.ok(frames[2].every(value => value === 0));
    assert.deepEqual(pixel(frames[1], side, padding + 10, padding + 10), [30, 60, 200, 255]);
    assert.equal(frames[1].length, frames[0].length);
});

test('khoảng cách tròn khớp phép đo trực tiếp trên nhiều điểm alpha', () => {
    const sourceSide = 24;
    const seeds = [[0, 0, 255], [6, 9, 128], [23, 22, 64], [12, 18, 255]];
    const source = new Uint8ClampedArray(sourceSide * sourceSide * 4);
    for (const [x, y, alpha] of seeds) source.set([255, 255, 255, alpha], (y * sourceSide + x) * 4);
    const { frames: [frame], side, padding } = addWhiteStroke([source], sourceSide, 0.08);
    for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
            const distance = Math.sqrt(Math.min(...seeds.map(([sx, sy, alpha]) => (x - sx - padding) ** 2 + (y - sy - padding) ** 2 + (1 - alpha / 255) ** 2)));
            const strokeAlpha = Math.max(0, Math.min(1, side * 0.08 + 0.5 - distance));
            const seed = seeds.find(([sx, sy]) => x === sx + padding && y === sy + padding);
            const sourceAlpha = seed ? seed[2] / 255 : 0;
            assert.equal(pixel(frame, side, x, y)[3], Math.round((sourceAlpha + strokeAlpha * (1 - sourceAlpha)) * 255));
        }
    }
});

test('renderer ghi viền vào WebP, PNG, GIF và giữ nhịp ảnh động', async () => {
    const { default: sharp } = await import('sharp');
    const { renderStickerImage } = await import('./sticker-image.mjs');
    const sourceSide = 48;
    const frameBytes = sourceSide * sourceSide * 4;
    const strip = Buffer.alloc(frameBytes * 2);
    for (let frame = 0; frame < 2; frame++) {
        for (let y = 16; y < 32; y++) {
            for (let x = 8 + frame * 16; x < 24 + frame * 16; x++) {
                strip.set(frame === 0 ? [220, 30, 30, 255] : [30, 60, 200, 255], frame * frameBytes + (y * sourceSide + x) * 4);
            }
        }
    }
    const delays = [80, 160];
    const gif = await sharp(strip, { raw: { width: sourceSide, height: sourceSide * 2, channels: 4, pageHeight: sourceSide } })
        .gif({ delay: delays, loop: 0 }).toBuffer();
    const edit = parseEdit({ fit: 'contain', removeBackground: false, strokeWidth: 0.08 });
    const result = await renderStickerImage(gif, edit, { size: 96, staticSize: 96 });
    assert.equal(result.details.frames, 2);
    assert.equal(result.details.durationMs, 240);
    for (const bytes of [result.stickerWebp, result.outboundGif]) {
        const metadata = await sharp(bytes, { animated: true }).metadata();
        assert.deepEqual(metadata.delay, delays);
        assert.equal(metadata.pages, 2);
        assert.equal(metadata.pageHeight, 96);
        const { data: rgba } = await sharp(bytes, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        for (let frameIndex = 0; frameIndex < 2; frameIndex++) {
            const frame = rgba.subarray(frameIndex * 96 * 96 * 4, (frameIndex + 1) * 96 * 96 * 4);
            let whitePixels = 0;
            let originalPixels = 0;
            for (let offset = 0; offset < frame.length; offset += 4) {
                if (frame[offset + 3] > 200 && frame[offset] > 225 && frame[offset + 1] > 225 && frame[offset + 2] > 225) whitePixels++;
                if (frame[offset + 3] > 200 && (frameIndex === 0 ? frame[offset] > 170 && frame[offset + 1] < 100 : frame[offset + 2] > 150 && frame[offset] < 100)) originalPixels++;
            }
            assert.ok(whitePixels > 100);
            assert.ok(originalPixels > 100);
            for (let position = 0; position < 96; position++) {
                assert.equal(pixel(frame, 96, position, 0)[3], 0);
                assert.equal(pixel(frame, 96, position, 95)[3], 0);
            }
        }
    }
    const { data: png } = await sharp(result.staticPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let whitePixels = 0;
    for (let offset = 0; offset < png.length; offset += 4) {
        if (png[offset] > 225 && png[offset + 1] > 225 && png[offset + 2] > 225 && png[offset + 3] > 200) whitePixels++;
    }
    assert.ok(whitePixels > 100);
});
