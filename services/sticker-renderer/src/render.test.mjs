import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CLI_PATH = fileURLToPath(new URL('./render.mjs', import.meta.url));
const STICKER_SIZE = 64;
const MAX_LARGE_JPEG_MS = 2000;
const RED = [220, 30, 30];
const HALO_THRESHOLD = 24;
const GIF_FRAMES = 10;
const GIF_DELAY_MS = 80;

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

function uniqueName(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

async function writeWorkFile(name, contents) {
    const filePath = join(workDir, name);
    await writeFile(filePath, contents);

    return filePath;
}

async function writeSvgAs(name, svg, format) {
    return writeWorkFile(name, await sharp(Buffer.from(svg)).toFormat(format).toBuffer());
}

async function renderOk(inputPath, extraArgs = []) {
    const outDir = join(workDir, uniqueName('out'));
    const run = await runCli([inputPath, outDir, ...extraArgs]);
    assert.equal(run.exitCode, 0, `render failed: ${JSON.stringify(run.output)} ${run.stderr}`);

    return { ...run, outDir };
}

async function renderWithEdit(inputPath, edit) {
    const editPath = await writeWorkFile(`${uniqueName('edit')}.json`, JSON.stringify(edit));

    return renderOk(inputPath, [`--edit=${editPath}`]);
}

async function readRgba(imagePath) {
    const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
}

function pixel(image, x, y) {
    const offset = (y * image.width + x) * 4;

    return Array.from(image.data.subarray(offset, offset + 4));
}

function assertCleanTransparency(image) {
    for (let offset = 0; offset < image.data.length; offset += 4) {
        if (image.data[offset + 3] !== 0) continue;
        assert.deepEqual(Array.from(image.data.subarray(offset, offset + 3)), [0, 0, 0], 'điểm trong suốt phải RGB 0');
    }
}

/** Mỗi khung một điểm sáng ở vị trí khác: bộ mã hoá GIF gộp các khung giống nhau thành một. */
function distinctFramesGif(frameCount, delayMs) {
    const side = 16;
    const frameBytes = side * side * 3;
    const strip = Buffer.alloc(frameBytes * frameCount);
    for (let frame = 0; frame < frameCount; frame++) strip.fill(255, frame * frameBytes + frame * 3, frame * frameBytes + frame * 3 + 3);

    return sharp(strip, { raw: { width: side, height: side * frameCount, channels: 3, pageHeight: side } })
        .gif({ delay: Array(frameCount).fill(delayMs) })
        .toBuffer();
}

function stickerSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
        <rect width="600" height="400" fill="rgb(128,128,128)"/>
        <circle cx="300" cy="200" r="150" fill="white"/>
        <circle cx="300" cy="200" r="130" fill="rgb(${RED})"/></svg>`;
}

describe('render.mjs', () => {
    test('JPG sticker viền trắng trên nền xám → webp + png 64×64, nền trong suốt, giữ viền trắng', async () => {
        const inputPath = await writeSvgAs('sticker.jpg', stickerSvg(), 'jpeg');
        const run = await renderOk(inputPath);

        assert.deepEqual(Object.keys(run.output).sort(), ['durationMs', 'frames', 'gif', 'height', 'image', 'static', 'staticSize', 'warnings', 'width']);
        assert.equal(run.output.gif, join(run.outDir, 'sticker.gif'));
        assert.equal(run.output.image, join(run.outDir, 'sticker.webp'));
        assert.equal(run.output.static, join(run.outDir, 'static.png'));
        assert.equal(run.output.width, STICKER_SIZE);
        assert.equal(run.output.frames, 1);
        assert.equal(run.output.durationMs, 0);
        assert.deepEqual(run.output.warnings, []);

        const webpMetadata = await sharp(run.output.image).metadata();
        assert.equal(webpMetadata.format, 'webp');
        assert.equal(webpMetadata.width, STICKER_SIZE);
        assert.equal(webpMetadata.height, STICKER_SIZE);
        assert.equal(webpMetadata.hasAlpha, true);

        const pngMetadata = await sharp(run.output.static).metadata();
        assert.equal(pngMetadata.format, 'png');
        assert.equal(pngMetadata.width, STICKER_SIZE);
        assert.equal(pngMetadata.paletteBitDepth, undefined, 'static.png đủ màu, không dùng bảng 256 màu');
        assert.equal(run.output.staticSize, STICKER_SIZE, 'không truyền --static-size thì ảnh tĩnh cùng cỡ sticker');

        for (const imagePath of [run.output.image, run.output.static]) {
            const image = await readRgba(imagePath);
            assert.deepEqual(pixel(image, 0, 0), [0, 0, 0, 0]);
            const border = pixel(image, 32, 3);
            assert.ok(border[3] === 255 && border[0] > 240 && border[1] > 240 && border[2] > 240, `viền trắng mất: ${border}`);
            const center = pixel(image, 32, 32);
            assert.ok(center[0] > 200 && center[1] < 60 && center[3] === 255, `ruột đỏ sai: ${center}`);
            assertCleanTransparency(image);
        }
    });

    test('vật đỏ trên nền trắng: đặt lên nền đen không có quầng trắng quanh viền', async () => {
        const inputPath = await writeSvgAs('red-on-white.png', `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
            <rect width="500" height="500" fill="white"/>
            <path d="M250 60 L440 420 L60 420 Z" fill="rgb(${RED})"/></svg>`, 'png');
        const run = await renderOk(inputPath);

        for (const imagePath of [run.output.image, run.output.static]) {
            const image = await readRgba(imagePath);
            assertCleanTransparency(image);
            for (let offset = 0; offset < image.data.length; offset += 4) {
                const alpha = image.data[offset + 3];
                for (let channel = 0; channel < 3; channel++) {
                    const onBlack = (image.data[offset + channel] * alpha) / 255;
                    assert.ok(onBlack <= RED[channel] + HALO_THRESHOLD, `quầng sáng ở ${imagePath} kênh ${channel}: ${onBlack}`);
                }
            }
        }
    });

    test('PNG trong suốt sẵn giữ nguyên hình', async () => {
        const inputPath = await writeSvgAs('transparent.png', `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <rect x="50" y="50" width="200" height="200" fill="white"/></svg>`, 'png');
        const run = await renderWithEdit(inputPath, { removeBackground: true, tolerance: 100 });

        const image = await readRgba(run.output.static);
        assert.deepEqual(pixel(image, 32, 32), [255, 255, 255, 255], 'hình trắng không bị xoá dù dung sai tối đa');
        assert.deepEqual(run.output.warnings, []);
    });

    test('crop chuẩn hoá chỉ lấy phần được chọn; removeBackground false giữ nền', async () => {
        const inputPath = await writeSvgAs('two-squares.png', `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
            <rect width="400" height="200" fill="white"/>
            <rect x="40" y="40" width="120" height="120" fill="red"/>
            <rect x="240" y="40" width="120" height="120" fill="blue"/></svg>`, 'png');

        const cropped = await renderWithEdit(inputPath, { crop: { x: 0, y: 0, w: 0.5, h: 1 }, removeBackground: true, tolerance: 20, feather: 0, edits: [] });
        const croppedImage = await readRgba(cropped.output.static);
        const [red, , blue, alpha] = pixel(croppedImage, 32, 32);
        assert.ok(red > 240 && blue < 20 && alpha === 255, 'giữa ảnh phải là ô đỏ, không có ô xanh');

        const kept = await renderWithEdit(inputPath, { crop: { x: 0, y: 0, w: 0.5, h: 1 }, removeBackground: false });
        assert.deepEqual(pixel(await readRgba(kept.output.static), 6, 6), [255, 255, 255, 255], 'không xoá nền thì nền trắng vẫn còn');
    });

    test('edits theo toạ độ chuẩn hoá: wand-remove xoá lỗ kín, brush-keep khôi phục', async () => {
        const inputPath = await writeSvgAs('ring.png', `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
            <rect width="200" height="200" fill="white"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgb(${RED})" stroke-width="20"/></svg>`, 'png');

        const removed = await renderWithEdit(inputPath, { edits: [{ op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 20 }] });
        assert.equal(pixel(await readRgba(removed.output.static), 32, 32)[3], 0);

        const restored = await renderWithEdit(inputPath, {
            edits: [
                { op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 20 },
                { op: 'brush-keep', points: [[0.5, 0.5]], radius: 0.1 },
            ],
        });
        assert.deepEqual(pixel(await readRgba(restored.output.static), 32, 32), [255, 255, 255, 255]);
    });

    test('GIF 10 khung → WebP động 64×64 đúng số khung và độ trễ; static.png 64×64 đủ màu', async () => {
        const side = 120;
        const frameBytes = side * side * 3;
        const strip = Buffer.alloc(frameBytes * GIF_FRAMES, 255);
        for (let frame = 0; frame < GIF_FRAMES; frame++) {
            const left = 20 + frame * 6;
            for (let y = 40; y < 80; y++) {
                for (let x = left; x < left + 30; x++) strip.set([30, 60, 200], frame * frameBytes + (y * side + x) * 3);
            }
        }
        const gif = await sharp(strip, { raw: { width: side, height: side * GIF_FRAMES, channels: 3, pageHeight: side } })
            .gif({ delay: Array(GIF_FRAMES).fill(GIF_DELAY_MS), loop: 0 })
            .toBuffer();
        const run = await renderOk(await writeWorkFile('moving.gif', gif));

        assert.equal(run.output.frames, GIF_FRAMES);
        assert.equal(run.output.durationMs, GIF_FRAMES * GIF_DELAY_MS);
        const metadata = await sharp(run.output.image, { animated: true }).metadata();
        assert.equal(metadata.format, 'webp');
        assert.equal(metadata.pages, GIF_FRAMES);
        assert.equal(metadata.width, STICKER_SIZE);
        assert.equal(metadata.pageHeight, STICKER_SIZE);
        assert.deepEqual(metadata.delay, Array(GIF_FRAMES).fill(GIF_DELAY_MS));
        assert.equal(metadata.loop, 0);

        const staticMetadata = await sharp(run.output.static).metadata();
        assert.equal(staticMetadata.width, STICKER_SIZE);
        assert.equal(staticMetadata.height, STICKER_SIZE);
        assert.equal(staticMetadata.paletteBitDepth, undefined);
    });

    describe('fit và vùng lấy vượt biên', () => {
        const TRIANGLE = [230, 40, 40];
        const CIRCLE = [120, 40, 200];

        function tallShapesSvg() {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="900">
                <rect width="300" height="900" fill="white"/>
                <path d="M150 40 L270 260 L30 260 Z" fill="rgb(${TRIANGLE})"/>
                <circle cx="150" cy="720" r="120" fill="rgb(${CIRCLE})"/></svg>`;
        }

        function countColor(image, rgb) {
            let count = 0;
            for (let offset = 0; offset < image.data.length; offset += 4) {
                if (image.data[offset + 3] < 200) continue;
                if ([0, 1, 2].every((channel) => Math.abs(image.data[offset + channel] - rgb[channel]) < 40)) count++;
            }

            return count;
        }

        function opaqueColumns(image) {
            const columns = new Set();
            for (let y = 0; y < image.height; y++) {
                for (let x = 0; x < image.width; x++) if (pixel(image, x, y)[3] > 0) columns.add(x);
            }

            return [Math.min(...columns), Math.max(...columns)];
        }

        test('contain: ảnh dọc 300×900 ra đủ cả tam giác lẫn hình tròn, lề hai bên trong suốt', async () => {
            const inputPath = await writeSvgAs('tall-shapes.png', tallShapesSvg(), 'png');
            const run = await renderWithEdit(inputPath, { fit: 'contain' });
            const image = await readRgba(run.output.image);

            assert.ok(countColor(image, TRIANGLE) > 20, 'mất tam giác');
            assert.ok(countColor(image, CIRCLE) > 20, 'mất hình tròn');
            const [firstColumn, lastColumn] = opaqueColumns(image);
            assert.ok(firstColumn >= 20 && lastColumn <= 43, `cả ảnh 300 rộng phải nằm giữa ô 64: cột ${firstColumn}..${lastColumn}`);
            assertCleanTransparency(image);
        });

        test('cover với khung vuông trong ảnh chỉ lấy một vật (đối chứng)', async () => {
            const inputPath = await writeSvgAs('tall-cover.png', tallShapesSvg(), 'png');
            const run = await renderWithEdit(inputPath, { crop: { x: 0, y: 0, w: 1, h: 1 / 3 } });
            const image = await readRgba(run.output.image);

            assert.ok(countColor(image, TRIANGLE) > 20);
            assert.equal(countColor(image, CIRCLE), 0);
        });

        test('khung vuông lớn hơn cạnh ngắn (vượt biên) ra đúng như contain cả ảnh', async () => {
            const inputPath = await writeSvgAs('tall-overflow.png', tallShapesSvg(), 'png');
            const whole = await renderWithEdit(inputPath, { fit: 'contain' });
            const overflow = await renderWithEdit(inputPath, { fit: 'contain', crop: { x: -1, y: 0, w: 3, h: 1 } });

            assert.deepEqual((await readRgba(overflow.output.image)).data, (await readRgba(whole.output.image)).data);
            assert.deepEqual((await readRgba(overflow.output.static)).data, (await readRgba(whole.output.static)).data);
        });

        test('vùng lấy vượt biên với cover: phần vượt không làm đổi kết quả', async () => {
            const inputPath = await writeSvgAs('cover-overflow.png', stickerSvg(), 'png');
            const plain = await renderOk(inputPath);
            const overflow = await renderWithEdit(inputPath, { crop: { x: -0.5, y: -0.5, w: 2, h: 2 } });

            assert.deepEqual((await readRgba(overflow.output.image)).data, (await readRgba(plain.output.image)).data);
        });

        test('edits theo toạ độ vùng lấy vượt biên; nhấp đũa thần vào phần trong suốt bị bỏ qua', async () => {
            const inputPath = await writeSvgAs('ring-overflow.png', `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <rect width="200" height="200" fill="white"/>
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgb(${RED})" stroke-width="20"/></svg>`, 'png');
            const crop = { x: -0.5, y: -0.5, w: 2, h: 2 };

            const removed = await renderWithEdit(inputPath, { fit: 'contain', crop, edits: [{ op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 20 }] });
            assert.equal(pixel(await readRgba(removed.output.static), 32, 32)[3], 0, 'tâm vùng lấy là tâm ảnh: lỗ phải bị xoá');

            const outside = await renderWithEdit(inputPath, { fit: 'contain', crop, removeBackground: false, edits: [{ op: 'wand-remove', x: 0.05, y: 0.05 }] });
            const background = pixel(await readRgba(outside.output.static), 20, 20);
            assert.ok(background[3] === 255 && background.slice(0, 3).every((channel) => channel > 240), `nhấp ngoài ảnh không được loang xoá nền trắng: ${background}`);
        });
    });

    describe('ảnh động vật chạy ngang', () => {
        const side = 120;
        const frameCount = 6;
        const radius = 12;
        const centers = Array.from({ length: frameCount }, (_, frame) => 20 + frame * 16);

        async function runningDotGif() {
            const frameBytes = side * side * 3;
            const strip = Buffer.alloc(frameBytes * frameCount, 255);
            centers.forEach((centerX, frame) => {
                for (let y = 0; y < side; y++) {
                    for (let x = 0; x < side; x++) {
                        if ((x - centerX) ** 2 + (y - 60) ** 2 <= radius ** 2) strip.set([30, 160, 60], frame * frameBytes + (y * side + x) * 3);
                    }
                }
            });

            return sharp(strip, { raw: { width: side, height: side * frameCount, channels: 3, pageHeight: side } })
                .gif({ delay: Array(frameCount).fill(100), loop: 0 })
                .toBuffer();
        }

        async function frameOpacity(imagePath) {
            const { data, info } = await sharp(imagePath, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
            const pageHeight = info.pageHeight ?? info.height;
            const frameBytes = info.width * pageHeight * 4;
            const frames = info.height / pageHeight;

            return Array.from({ length: frames }, (_, frame) => {
                let opaque = 0;
                let touchesEdge = false;
                for (let y = 0; y < pageHeight; y++) {
                    for (let x = 0; x < info.width; x++) {
                        if (data[frame * frameBytes + (y * info.width + x) * 4 + 3] < 128) continue;
                        opaque++;
                        if (x === 0 || y === 0 || x === info.width - 1 || y === pageHeight - 1) touchesEdge = true;
                    }
                }

                return { opaque, touchesEdge };
            });
        }

        function assertEveryFrameWhole(frames) {
            assert.equal(frames.length, frameCount);
            const largest = Math.max(...frames.map((frame) => frame.opaque));
            frames.forEach((frame, index) => {
                assert.ok(frame.opaque > largest * 0.8, `khung ${index + 1} bị cắt: ${frame.opaque}/${largest}`);
                assert.equal(frame.touchesEdge, false, `khung ${index + 1} chạm mép`);
            });
        }

        test('không cắt: lấy hợp khung bao của mọi khung, không khung nào bị cắt hay trống', async () => {
            const run = await renderOk(await writeWorkFile('running-dot.gif', await runningDotGif()));

            assertEveryFrameWhole(await frameOpacity(run.output.image));
        });

        test('vùng lấy là hợp khung bao mọi khung (client gửi): giữ đủ mọi khung, cả cover lẫn contain', async () => {
            const inputPath = await writeWorkFile('running-dot-crop.gif', await runningDotGif());
            const left = (centers[0] - radius - 4) / side;
            const right = (centers[frameCount - 1] + radius + 4) / side;
            const crop = { x: left, y: (60 - radius - 4) / side, w: right - left, h: (2 * radius + 8) / side };

            for (const fit of ['cover', 'contain']) {
                const run = await renderWithEdit(inputPath, { crop, fit });
                assertEveryFrameWhole(await frameOpacity(run.output.image));
            }
        });
    });

    describe('sticker.gif cho kênh ngoài', () => {
        async function gifFrames(gifPath) {
            const { data, info } = await sharp(gifPath, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

            return { data, width: info.width, pageHeight: info.pageHeight ?? info.height, pages: info.height / (info.pageHeight ?? info.height) };
        }

        test('ảnh tĩnh: GIF một khung cạnh --static-size, trong suốt 1 bit, giữ màu vật', async () => {
            const run = await renderOk(await writeSvgAs('gif-static.jpg', stickerSvg(), 'jpeg'), ['--static-size=128']);
            const metadata = await sharp(run.output.gif).metadata();
            const frames = await gifFrames(run.output.gif);

            assert.equal(metadata.format, 'gif');
            assert.equal(metadata.width, 128);
            assert.equal(frames.pageHeight, 128);
            assert.equal(frames.pages, 1);
            for (let offset = 3; offset < frames.data.length; offset += 4) {
                assert.ok(frames.data[offset] === 0 || frames.data[offset] === 255, `alpha ${frames.data[offset]} không phải 1 bit`);
            }
            const image = { data: frames.data, width: 128, height: 128 };
            assert.equal(pixel(image, 0, 0)[3], 0, 'góc nền phải trong suốt');
            const center = pixel(image, 64, 64);
            assert.ok(center[0] > 180 && center[1] < 80 && center[3] === 255, `ruột đỏ sai: ${center}`);
        });

        test('ảnh động: GIF giữ đủ khung và độ trễ của nguồn', async () => {
            const side = 120;
            const frameBytes = side * side * 3;
            const strip = Buffer.alloc(frameBytes * GIF_FRAMES, 255);
            for (let frame = 0; frame < GIF_FRAMES; frame++) {
                for (let y = 40; y < 80; y++) {
                    for (let x = 20 + frame * 6; x < 50 + frame * 6; x++) strip.set([30, 60, 200], frame * frameBytes + (y * side + x) * 3);
                }
            }
            const gif = await sharp(strip, { raw: { width: side, height: side * GIF_FRAMES, channels: 3, pageHeight: side } })
                .gif({ delay: Array(GIF_FRAMES).fill(GIF_DELAY_MS), loop: 0 })
                .toBuffer();
            const run = await renderOk(await writeWorkFile('gif-moving.gif', gif), ['--static-size=128']);
            const metadata = await sharp(run.output.gif, { animated: true }).metadata();

            assert.equal(metadata.format, 'gif');
            assert.equal(metadata.pages, GIF_FRAMES);
            assert.equal(metadata.pageHeight, 128);
            assert.deepEqual(metadata.delay, Array(GIF_FRAMES).fill(GIF_DELAY_MS));
            assert.equal(metadata.loop, 0);
        });
    });

    test('JPG 4000×3000 xử lý dưới 2 giây', async () => {
        const jpeg = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#d8d8d8' } })
            .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="3000">
                <circle cx="2000" cy="1500" r="1100" fill="rgb(${RED})"/></svg>`) }])
            .jpeg({ quality: 85 })
            .toBuffer();
        const run = await renderOk(await writeWorkFile('large.jpg', jpeg));

        assert.ok(run.elapsedMs < MAX_LARGE_JPEG_MS, `mất ${Math.round(run.elapsedMs)}ms`);
        assert.equal(pixel(await readRgba(run.output.static), 0, 0)[3], 0);
    });

    test('quá --timeout-ms thì dừng cứng, báo timeout, không ghi tệp', async () => {
        const inputPath = await writeSvgAs('timeout.jpg', stickerSvg(), 'jpeg');
        const outDir = join(workDir, uniqueName('timeout'));
        const run = await runCli([inputPath, outDir, '--timeout-ms=1']);

        assert.equal(run.exitCode, 1);
        assert.deepEqual(run.output, { error: 'timeout' });
        assert.equal(existsSync(join(outDir, 'sticker.webp')), false);
    });

    test('nền phẳng một màu bị xoá hết thì cảnh báo mask_empty', async () => {
        const inputPath = await writeWorkFile('flat.png', await sharp({ create: { width: 50, height: 50, channels: 3, background: '#336699' } }).png().toBuffer());
        const run = await renderOk(inputPath);

        assert.deepEqual(run.output.warnings, ['mask_empty']);
    });

    test('--size đổi cạnh đầu ra', async () => {
        const run = await renderOk(await writeSvgAs('sized.png', stickerSvg(), 'png'), ['--size=128']);
        assert.equal((await sharp(run.output.image).metadata()).width, 128);
        assert.equal(run.output.width, 128);
    });

    describe('mã lỗi', () => {
        const cases = [
            ['thiếu tham số', async () => ['only-one-arg'], 'usage'],
            ['tuỳ chọn lạ', async () => [await writeSvgAs('opt.png', stickerSvg(), 'png'), join(workDir, 'x'), '--frame=1'], 'usage'],
            ['size ngoài khoảng', async () => [await writeSvgAs('size.png', stickerSvg(), 'png'), join(workDir, 'x'), '--size=8'], 'usage'],
            ['edit.json không phải JSON', async () => [await writeSvgAs('e1.png', stickerSvg(), 'png'), join(workDir, 'x'), `--edit=${await writeWorkFile('bad.json', '{')}`], 'usage'],
            ['edit.json sai giá trị', async () => [await writeSvgAs('e2.png', stickerSvg(), 'png'), join(workDir, 'x'), `--edit=${await writeWorkFile('bad2.json', '{"tolerance":150}')}`], 'usage'],
            ['fit lạ', async () => [await writeSvgAs('e4.png', stickerSvg(), 'png'), join(workDir, 'x'), `--edit=${await writeWorkFile('bad4.json', '{"fit":"stretch"}')}`], 'usage'],
            ['vùng lấy vượt biên quá xa', async () => [await writeSvgAs('e5.png', stickerSvg(), 'png'), join(workDir, 'x'), `--edit=${await writeWorkFile('bad5.json', '{"crop":{"x":-9,"y":0,"w":10,"h":1}}')}`], 'usage'],
            ['vùng lấy không giao ảnh', async () => [await writeSvgAs('e6.png', stickerSvg(), 'png'), join(workDir, 'x'), `--edit=${await writeWorkFile('bad6.json', '{"crop":{"x":-3,"y":0,"w":2,"h":1}}')}`], 'usage'],
            ['edit.json thao tác lạ', async () => [await writeSvgAs('e3.png', stickerSvg(), 'png'), join(workDir, 'x'), `--edit=${await writeWorkFile('bad3.json', '{"edits":[{"op":"erase"}]}')}`], 'usage'],
            ['tệp không tồn tại', async () => [join(workDir, 'missing.png'), join(workDir, 'x')], 'input_unreadable'],
            ['không phải ảnh', async () => [await writeWorkFile('garbage.png', 'not an image'), join(workDir, 'x')], 'input_unreadable'],
            ['định dạng không hỗ trợ', async () => [await writeWorkFile('vector.svg', stickerSvg()), join(workDir, 'x')], 'unsupported_format'],
            ['tệp quá 20 MB', async () => [await writeWorkFile('huge.png', Buffer.alloc(20 * 1024 * 1024 + 1)), join(workDir, 'x')], 'input_too_large'],
            ['quá 25 megapixel', async () => [await writeWorkFile('mega.jpg', await sharp({ create: { width: 5001, height: 5001, channels: 3, background: '#fff' } }).jpeg().toBuffer()), join(workDir, 'x')], 'input_too_large'],
            ['quá 200 khung', async () => [await writeWorkFile('frames.gif', await distinctFramesGif(201, 100)), join(workDir, 'x')], 'too_many_frames'],
            ['ảnh động dài quá 10 giây', async () => [await writeWorkFile('long.gif', await distinctFramesGif(3, 5000)), join(workDir, 'x')], 'input_too_large'],
        ];

        for (const [name, buildArgs, expectedCode] of cases) {
            test(`${name} → ${expectedCode}`, async () => {
                const run = await runCli(await buildArgs());
                assert.equal(run.exitCode, 1, run.stderr);
                assert.deepEqual(run.output, { error: expectedCode });
            });
        }
    });

    test('--static-size dựng ảnh tĩnh kênh ngoài ở cỡ riêng, co thẳng từ ảnh gốc chứ không phóng to bản 64', async () => {
        const inputPath = await writeSvgAs('sharp.jpg', stickerSvg(), 'jpeg');
        const run = await renderOk(inputPath, ['--static-size=128']);

        assert.equal(run.output.width, STICKER_SIZE);
        assert.equal(run.output.staticSize, 128);
        assert.equal((await sharp(run.output.image).metadata()).width, STICKER_SIZE);
        const staticMetadata = await sharp(run.output.static).metadata();
        assert.equal(staticMetadata.width, 128);
        assert.equal(staticMetadata.height, 128);
        assert.equal(staticMetadata.paletteBitDepth, undefined);

        const image = await readRgba(run.output.static);
        assert.deepEqual(pixel(image, 0, 0), [0, 0, 0, 0]);
        let detailedBlocks = 0;
        for (let blockY = 0; blockY < 128; blockY += 2) {
            for (let blockX = 0; blockX < 128; blockX += 2) {
                const corner = pixel(image, blockX, blockY).join();
                const same = [[1, 0], [0, 1], [1, 1]].every(([dx, dy]) => pixel(image, blockX + dx, blockY + dy).join() === corner);
                if (!same) detailedBlocks++;
            }
        }
        assert.ok(detailedBlocks > 50, `ảnh tĩnh 128 giống bản 64 phóng to (chỉ ${detailedBlocks} ô 2×2 có chi tiết)`);
    });

    test('--static-size ngoài khoảng cho phép là lỗi usage', async () => {
        const inputPath = await writeSvgAs('bad-size.jpg', stickerSvg(), 'jpeg');
        const run = await runCli([inputPath, join(workDir, uniqueName('out')), '--static-size=4']);

        assert.equal(run.exitCode, 1);
        assert.deepEqual(run.output, { error: 'usage' });
    });

    test('cỡ tệp đầu ra điển hình nằm trong ngân sách', async () => {
        const run = await renderOk(await writeSvgAs('budget.jpg', stickerSvg(), 'jpeg'));
        const [webpBytes, pngBytes] = await Promise.all([stat(run.output.image), stat(run.output.static)]).then((stats) => stats.map((item) => item.size));

        assert.ok(webpBytes < 8 * 1024, `sticker.webp ${webpBytes} bytes`);
        assert.ok(pngBytes < 8 * 1024, `static.png ${pngBytes} bytes`);

        const outbound = await renderOk(await writeSvgAs('budget-128.jpg', stickerSvg(), 'jpeg'), ['--static-size=128']);
        const outboundBytes = (await stat(outbound.output.static)).size;
        assert.ok(outboundBytes < 20 * 1024, `static.png 128px ${outboundBytes} bytes`);
    });
});
