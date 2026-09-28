import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { applyMask, buildMask, dominantEdgeColor, hasTransparentEdges } from './background-mask.mjs';

const GRAY = 'rgb(128,128,128)';
const RED = [220, 30, 30];
const HALO_THRESHOLD = 24;

async function rasterize(svg) {
    const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    return { rgba: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

function alphaAt(mask, width, x, y) {
    return mask.alpha[y * width + x];
}

function pixelAt(rgba, width, x, y) {
    const offset = (y * width + x) * 4;

    return Array.from(rgba.subarray(offset, offset + 4));
}

describe('buildMask', () => {
    test('sticker viền trắng trên nền xám: xoá nền xám, giữ viền trắng và ruột đỏ', async () => {
        const image = await rasterize(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160">
            <rect width="200" height="160" fill="${GRAY}"/>
            <circle cx="100" cy="80" r="60" fill="white"/>
            <circle cx="100" cy="80" r="50" fill="rgb(${RED})"/></svg>`);
        const matte = buildMask(image.rgba, image.width, image.height, { tolerance: 20 });

        assert.equal(alphaAt(matte, image.width, 2, 2), 0);
        assert.equal(alphaAt(matte, image.width, 100, 24), 255, 'viền trắng phải giữ');
        assert.equal(alphaAt(matte, image.width, 100, 80), 255, 'ruột đỏ phải giữ');
        assert.ok(matte.autoRemoved > 0);
        assert.deepEqual(dominantEdgeColor(image.rgba, image.width, image.height), [128, 128, 128]);
    });

    test('PNG đã trong suốt sẵn: bỏ lượt tự động, không đổi alpha', async () => {
        const image = await rasterize(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
            <circle cx="50" cy="50" r="30" fill="white"/></svg>`);
        const before = Uint8ClampedArray.from(image.rgba);
        assert.equal(hasTransparentEdges(image.rgba, image.width, image.height), true);

        const matte = buildMask(image.rgba, image.width, image.height, { tolerance: 100 });
        assert.equal(matte.autoRemoved, null);
        assert.ok(matte.alpha.every((value) => value === 255));

        applyMask(image.rgba, matte);
        for (let offset = 3; offset < before.length; offset += 4) assert.equal(image.rgba[offset], before[offset]);
    });

    test('wand-remove xoá vùng kín không nối mép; brush-keep khôi phục', async () => {
        const image = await rasterize(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
            <rect width="100" height="100" fill="white"/>
            <circle cx="50" cy="50" r="35" fill="none" stroke="rgb(${RED})" stroke-width="10"/></svg>`);

        const automatic = buildMask(image.rgba, image.width, image.height, {});
        assert.equal(alphaAt(automatic, image.width, 1, 1), 0);
        assert.equal(alphaAt(automatic, image.width, 50, 50), 255, 'lỗ giữa vòng không nối mép nên lượt tự động giữ');

        const wanded = buildMask(image.rgba, image.width, image.height, { edits: [{ op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 20 }] });
        assert.equal(alphaAt(wanded, image.width, 50, 50), 0);
        assert.equal(alphaAt(wanded, image.width, 50, 15), 255, 'vòng đỏ vẫn giữ');

        const restored = buildMask(image.rgba, image.width, image.height, {
            edits: [
                { op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 20 },
                { op: 'brush-keep', points: [[0.45, 0.5], [0.55, 0.5]], radius: 0.05 },
            ],
        });
        assert.equal(alphaAt(restored, image.width, 50, 50), 255);
        assert.equal(alphaAt(restored, image.width, 50, 35), 0, 'ngoài nét cọ vẫn bị xoá');

        const brushed = buildMask(image.rgba, image.width, image.height, { edits: [{ op: 'brush-remove', points: [[0.5, 0.15]], radius: 0.1 }] });
        assert.equal(alphaAt(brushed, image.width, 50, 15), 0);
    });

    test('wand-keep giữ lại vùng mà lượt tự động đã xoá', async () => {
        const image = await rasterize(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
            <rect width="60" height="60" fill="white"/><rect x="20" y="20" width="20" height="20" fill="blue"/></svg>`);
        const matte = buildMask(image.rgba, image.width, image.height, { edits: [{ op: 'wand-keep', x: 0.05, y: 0.05, tolerance: 10 }] });

        assert.equal(alphaAt(matte, image.width, 2, 2), 255);
    });

    test('nền sau khi xoá trong suốt tuyệt đối, viền không quầng trắng khi đặt lên nền đen', async () => {
        const image = await rasterize(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
            <rect width="200" height="200" fill="white"/>
            <circle cx="100" cy="100" r="70" fill="rgb(${RED})"/></svg>`);
        const matte = buildMask(image.rgba, image.width, image.height, { tolerance: 20 });
        applyMask(image.rgba, matte);

        let partialEdgePixels = 0;
        for (let offset = 0; offset < image.rgba.length; offset += 4) {
            const alpha = image.rgba[offset + 3];
            if (alpha === 0) {
                assert.deepEqual(Array.from(image.rgba.subarray(offset, offset + 3)), [0, 0, 0], 'điểm trong suốt phải RGB 0');
                continue;
            }
            if (alpha < 255) partialEdgePixels++;
            for (let channel = 0; channel < 3; channel++) {
                const onBlack = (image.rgba[offset + channel] * alpha) / 255;
                assert.ok(onBlack <= RED[channel] + HALO_THRESHOLD, `quầng sáng ở kênh ${channel}: ${onBlack}`);
            }
        }
        assert.ok(partialEdgePixels > 0, 'viền khử răng cưa phải thành bán trong suốt');
        assert.deepEqual(pixelAt(image.rgba, image.width, 0, 0), [0, 0, 0, 0]);
    });

    test('feather mặc định 0 giữ viền cứng; feather > 0 làm mềm vào trong', async () => {
        const image = await rasterize(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <rect width="40" height="40" fill="white"/><rect x="10" y="10" width="20" height="20" fill="black"/></svg>`);
        const hard = buildMask(image.rgba, image.width, image.height, {});
        const soft = buildMask(image.rgba, image.width, image.height, { feather: 2 });

        assert.equal(alphaAt(hard, image.width, 10, 20), 255);
        assert.ok(alphaAt(soft, image.width, 10, 20) < 255);
        assert.equal(alphaAt(soft, image.width, 9, 20), 0, 'làm mềm không lan ra nền');
        assert.equal(alphaAt(soft, image.width, 20, 20), 255);
    });

    test('sai kích thước buffer thì báo lỗi', () => {
        assert.throws(() => buildMask(new Uint8ClampedArray(12), 2, 2, {}), RangeError);
    });
});
