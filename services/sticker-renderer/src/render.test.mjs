import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';

const CLI_PATH = fileURLToPath(new URL('./render.mjs', import.meta.url));
const FIXTURE_DIR = fileURLToPath(new URL('../../../tests/Fixtures/stickers/', import.meta.url));
const MAX_RENDER_MS = 2000;
const POSTER_SIZE = 256;
const STATIC_SIZE = 512;
const OPAQUE_ALPHA = 250;

let workDir;

before(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'sticker-render-test-'));
});

after(async () => {
    await rm(workDir, { recursive: true, force: true });
});

function runCli(args) {
    return new Promise((resolve) => {
        const startedAt = performance.now();
        execFile(process.execPath, [CLI_PATH, ...args], { timeout: 30_000 }, (error, stdout, stderr) => {
            resolve({
                exitCode: error ? (error.code ?? 1) : 0,
                output: stdout.trim() ? JSON.parse(stdout) : null,
                stderr,
                elapsedMs: performance.now() - startedAt,
            });
        });
    });
}

async function renderFixture(fixtureName, extraArgs = []) {
    const outDir = join(workDir, `${fixtureName}-${Math.random().toString(36).slice(2)}`);
    const run = await runCli([join(FIXTURE_DIR, fixtureName), outDir, ...extraArgs]);
    assert.equal(run.exitCode, 0, `render failed: ${JSON.stringify(run.output)} ${run.stderr}`);

    return { ...run, outDir };
}

async function readRgba(imagePath) {
    const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    return {
        pixelAt(x, y) {
            const offset = (y * info.width + x) * 4;
            const [red, green, blue, alpha] = data.subarray(offset, offset + 4);

            return { red, green, blue, alpha };
        },
    };
}

async function assertTransparentImage(imagePath, expectedFormat, expectedSize) {
    const metadata = await sharp(imagePath).metadata();
    assert.equal(metadata.format, expectedFormat);
    assert.equal(metadata.width, expectedSize);
    assert.equal(metadata.height, expectedSize);
    assert.equal(metadata.hasAlpha, true);

    const image = await readRgba(imagePath);
    assert.equal(image.pixelAt(0, 0).alpha, 0, 'góc ảnh phải trong suốt');
}

async function writeWorkFile(name, contents) {
    const filePath = join(workDir, name);
    await writeFile(filePath, contents);

    return filePath;
}

async function assertRenderError(inputPath, expectedCode, extraArgs = []) {
    const outDir = join(workDir, `error-${expectedCode}-${Math.random().toString(36).slice(2)}`);
    const run = await runCli([inputPath, outDir, ...extraArgs]);

    assert.notEqual(run.exitCode, 0);
    assert.deepEqual(run.output, { error: expectedCode });
    assert.equal(existsSync(outDir) ? (await readdir(outDir)).length : 0, 0, 'lỗi thì không được ghi tệp ra');

    return run;
}

function repeaterBombLottie(copiesPerLevel) {
    const staticValue = (k) => ({ a: 0, k });
    const groupTransform = { ty: 'tr', p: staticValue([0, 0]), a: staticValue([0, 0]), s: staticValue([100, 100]), r: staticValue(0), o: staticValue(100) };
    const repeater = {
        ty: 'rp',
        c: staticValue(copiesPerLevel),
        o: staticValue(0),
        m: 1,
        tr: { ty: 'tr', p: staticValue([1, 0]), a: staticValue([0, 0]), s: staticValue([100, 100]), r: staticValue(1), so: staticValue(100), eo: staticValue(100) },
    };
    const innerGroup = {
        ty: 'gr',
        it: [
            { ty: 'el', p: staticValue([0, 0]), s: staticValue([50, 50]) },
            { ty: 'fl', c: staticValue([1, 0, 0, 1]), o: staticValue(100) },
            repeater,
            groupTransform,
        ],
    };

    return {
        v: '5.7.0', fr: 30, ip: 0, op: 30, w: 512, h: 512,
        layers: [{
            ty: 4, ip: 0, op: 30, st: 0,
            ks: { o: staticValue(100), r: staticValue(0), p: staticValue([256, 256]), a: staticValue([0, 0]), s: staticValue([100, 100]) },
            shapes: [{ ty: 'gr', it: [innerGroup, repeater, groupTransform] }],
        }],
    };
}

describe('render thành công', () => {
    for (const fixtureName of ['ball-with-poster-marker.json', 'ball-with-poster-marker.tgs', 'pulse-without-marker.json', 'embedded-bitmap.json']) {
        test(`${fixtureName}: ra poster.webp 256px và static.png 512px nền trong suốt trong ≤2s`, async () => {
            const { output, outDir, elapsedMs } = await renderFixture(fixtureName);

            assert.ok(elapsedMs <= MAX_RENDER_MS, `render mất ${Math.round(elapsedMs)}ms`);
            assert.equal(output.poster, join(outDir, 'poster.webp'));
            assert.equal(output.static, join(outDir, 'static.png'));
            await assertTransparentImage(output.poster, 'webp', POSTER_SIZE);
            await assertTransparentImage(output.static, 'png', STATIC_SIZE);
        });
    }

    test('--static-size dựng ảnh tĩnh gửi kênh ngoài đúng cỡ, poster giữ nguyên', async () => {
        const { output } = await renderFixture('ball-with-poster-marker.json', ['--static-size=128']);

        await assertTransparentImage(output.static, 'png', 128);
        await assertTransparentImage(output.poster, 'webp', POSTER_SIZE);
        assert.equal(output.staticSize, 128);
    });

    test('--static-size ngoài khoảng cho phép là lỗi usage', async () => {
        const inputPath = join(FIXTURE_DIR, 'ball-with-poster-marker.json');

        await assertRenderError(inputPath, 'usage', ['--static-size=4']);
        await assertRenderError(inputPath, 'usage', ['--static-size=1024']);
    });
});

describe('chọn khung ảnh tĩnh', () => {
    for (const fixtureName of ['ball-with-poster-marker.json', 'ball-with-poster-marker.tgs']) {
        test(`${fixtureName}: dùng khung của marker poster`, async () => {
            const { output } = await renderFixture(fixtureName);

            assert.equal(output.frame, 45);
            assert.deepEqual(output.warnings, []);
            assert.equal(output.width, 512);
            assert.equal(output.height, 512);
            assert.equal(output.frames, 60);
            assert.equal(output.duration, 2);

            const image = await readRgba(output.static);
            const ballAtMarkerFrame = image.pixelAt(384, 256);
            assert.ok(ballAtMarkerFrame.alpha >= OPAQUE_ALPHA);
            assert.ok(ballAtMarkerFrame.red > 200 && ballAtMarkerFrame.green < 60);
            assert.equal(image.pixelAt(128, 256).alpha, 0, 'bóng ở khung giữa không được xuất hiện');

            const halfTransparentHalo = image.pixelAt(256, 96).alpha;
            assert.ok(halfTransparentHalo > 100 && halfTransparentHalo < 160, `alpha halo = ${halfTransparentHalo}`);
        });
    }

    test('không có marker poster: lấy khung giữa (ip+op)/2 và cảnh báo', async () => {
        const { output } = await renderFixture('pulse-without-marker.json');

        assert.equal(output.frame, 50);
        assert.deepEqual(output.warnings, ['poster_marker_missing']);
        assert.equal(output.frames, 80);

        const center = (await readRgba(output.static)).pixelAt(256, 256);
        assert.ok(center.alpha >= OPAQUE_ALPHA);
        assert.ok(center.red > 200 && center.green < 60 && center.blue < 60, `tâm phải đỏ, nhận ${JSON.stringify(center)}`);
    });

    test('marker poster nằm ngoài [ip, op): lấy khung giữa và cảnh báo', async () => {
        const document = {
            v: '5.7.0', fr: 30, ip: 0, op: 40, w: 128, h: 128,
            markers: [{ cm: 'poster', tm: 400, dr: 0 }],
            layers: [{
                ty: 4, ip: 0, op: 40, st: 0,
                ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [64, 64] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
                shapes: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 40] }, r: { a: 0, k: 0 } }, { ty: 'fl', c: { a: 0, k: [0, 0, 1, 1] }, o: { a: 0, k: 100 } }],
            }],
        };
        const inputPath = await writeWorkFile('marker-out-of-range.json', JSON.stringify(document));
        const run = await runCli([inputPath, join(workDir, 'marker-out-of-range')]);

        assert.equal(run.exitCode, 0);
        assert.equal(run.output.frame, 20);
        assert.deepEqual(run.output.warnings, ['poster_marker_out_of_range']);
    });

    test('bitmap nhúng được vẽ ra ảnh', async () => {
        const { output } = await renderFixture('embedded-bitmap.json');

        assert.equal(output.frame, 10);
        const center = (await readRgba(output.static)).pixelAt(256, 256);
        assert.ok(center.alpha >= OPAQUE_ALPHA && center.green > 120 && center.red < 60, JSON.stringify(center));
    });
});

describe('lỗi đầu vào', () => {
    test('JSON hỏng', async () => {
        await assertRenderError(join(FIXTURE_DIR, 'broken.json'), 'invalid_json');
    });

    test('JSON hợp lệ nhưng không phải Lottie', async () => {
        await assertRenderError(await writeWorkFile('not-lottie.json', '{"hello":"world"}'), 'invalid_lottie');
    });

    test('Lottie có khung thời gian rỗng', async () => {
        await assertRenderError(await writeWorkFile('empty-timeline.json', '{"v":"5.7.0","fr":30,"ip":10,"op":10,"w":64,"h":64,"layers":[]}'), 'invalid_lottie');
    });

    test('tệp không tồn tại', async () => {
        await assertRenderError(join(workDir, 'missing.json'), 'input_unreadable');
    });

    test('gzip hỏng', async () => {
        await assertRenderError(await writeWorkFile('corrupt.tgs', Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0xde, 0xad, 0xbe, 0xef])), 'invalid_gzip');
    });

    test('gzip bomb bị chặn theo trần giải nén', async () => {
        await assertRenderError(await writeWorkFile('bomb.tgs', gzipSync(Buffer.alloc(64 * 1024 * 1024, 0x20))), 'input_too_large');
    });

    test('thiếu tham số', async () => {
        const run = await runCli([]);

        assert.notEqual(run.exitCode, 0);
        assert.deepEqual(run.output, { error: 'usage' });
    });

    test('render quá thời gian thì bị cắt cứng', async () => {
        const inputPath = await writeWorkFile('repeater-bomb.json', JSON.stringify(repeaterBombLottie(1000)));
        const run = await assertRenderError(inputPath, 'timeout', ['--timeout-ms=300']);

        assert.ok(run.elapsedMs < 3000, `timeout phải cắt sớm, mất ${Math.round(run.elapsedMs)}ms`);
    });
});
