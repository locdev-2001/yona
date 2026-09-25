import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
    SESSION_DIR_MODE,
    SESSION_FILE_MODE,
    copySessionFile,
    ensureSessionDir,
    hardenSessionStore,
    readSessionFile,
    writeSessionFile,
} from './session-store-fs.mjs';

async function tempStore() {
    return fs.mkdtemp(path.join(os.tmpdir(), 'zbr-sessions-'));
}

const KEY_A = Buffer.alloc(32, 7).toString('base64');
const KEY_B = Buffer.alloc(32, 9).toString('base64');

/** Đặt biến môi trường trong lúc chạy `fn`, luôn khôi phục lại sau đó dù `fn` ném lỗi. */
async function withEnv(vars, fn) {
    const previous = {};
    for (const key of Object.keys(vars)) {
        previous[key] = process.env[key];
        if (vars[key] === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = vars[key];
        }
    }
    try {
        return await fn();
    } finally {
        for (const key of Object.keys(previous)) {
            if (previous[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = previous[key];
            }
        }
    }
}

const modeOf = async (target) => (await fs.stat(target)).mode & 0o777;

test('ghi tệp phiên ra mode 0600 trong thư mục 0700', async () => {
    const dir = await tempStore();
    const file = path.join(dir, 'nested', 'c1.json');

    await writeSessionFile(file, JSON.stringify({ cookie: 'secret' }));

    assert.equal(await modeOf(file), SESSION_FILE_MODE);
    assert.equal(await modeOf(path.dirname(file)), SESSION_DIR_MODE);
    assert.equal(await fs.readFile(file, 'utf8'), '{"cookie":"secret"}');
});

test('ghi đè tệp đã tồn tại với quyền lỏng vẫn siết lại về 0600', async () => {
    const dir = await tempStore();
    const file = path.join(dir, 'c2.json');
    await fs.writeFile(file, 'old', { mode: 0o664 });
    await fs.chmod(file, 0o664);

    await writeSessionFile(file, 'new');

    assert.equal(await modeOf(file), SESSION_FILE_MODE);
});

test('bản sao khi promote qr→connection không mang theo quyền lỏng', async () => {
    const dir = await tempStore();
    const from = path.join(dir, 'qt_abc.json');
    const to = path.join(dir, 'c9.json');
    await fs.writeFile(from, 'cookie', { mode: 0o666 });
    await fs.chmod(from, 0o666);

    await copySessionFile(from, to);

    assert.equal(await modeOf(to), SESSION_FILE_MODE);
});

test('boot siết quyền tệp phiên cũ và bỏ qua thư mục con', async () => {
    const dir = await tempStore();
    await fs.chmod(dir, 0o775);
    await fs.writeFile(path.join(dir, 'c1.json'), 'a', { mode: 0o664 });
    await fs.chmod(path.join(dir, 'c1.json'), 0o664);
    await fs.writeFile(path.join(dir, 'c1.json.meta.json'), 'b', { mode: 0o600 });
    await fs.mkdir(path.join(dir, 'dead'), { recursive: true });

    const hardened = await hardenSessionStore(dir);

    assert.equal(hardened, 1);
    assert.equal(await modeOf(path.join(dir, 'c1.json')), SESSION_FILE_MODE);
    assert.equal(await modeOf(dir), SESSION_DIR_MODE);
});

test('ensureSessionDir chạy lại nhiều lần không lỗi', async () => {
    const dir = path.join(await tempStore(), 'a', 'b');

    await ensureSessionDir(dir);
    await ensureSessionDir(dir);

    assert.equal(await modeOf(dir), SESSION_DIR_MODE);
});

test('có BRIDGE_SESSION_KEY: ghi ra ciphertext trên đĩa, đọc lại đúng bản gốc', async () => {
    await withEnv({ BRIDGE_SESSION_KEY: KEY_A }, async () => {
        const dir = await tempStore();
        const file = path.join(dir, 'c1.json');
        const plaintext = JSON.stringify({ cookie: 'secret', imei: 'x' });

        await writeSessionFile(file, plaintext);
        const onDisk = await fs.readFile(file, 'utf8');
        const envelope = JSON.parse(onDisk);

        assert.equal(envelope.v, 1);
        assert.ok(typeof envelope.iv === 'string' && typeof envelope.tag === 'string');
        assert.notEqual(onDisk, plaintext);
        assert.equal(await readSessionFile(file), plaintext);
    });
});

test('tệp bản cũ chưa mã hoá vẫn đọc được, và được ghi đè lại dạng mã hoá ngay lần đọc đó', async () => {
    await withEnv({ BRIDGE_SESSION_KEY: KEY_A }, async () => {
        const dir = await tempStore();
        const file = path.join(dir, 'c2.json');
        const plaintext = JSON.stringify({ cookie: 'old-plaintext' });
        // Mô phỏng tệp do bản bridge CHƯA có mã hoá ghi ra — bỏ qua writeSessionFile.
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file, plaintext, { mode: 0o600 });

        const first = await readSessionFile(file);
        assert.equal(first, plaintext);

        // di trú là fire-and-forget trong readSessionFile — đợi tick để ghi xong.
        await new Promise((resolve) => setTimeout(resolve, 20));
        const migrated = JSON.parse(await fs.readFile(file, 'utf8'));
        assert.equal(migrated.v, 1);
        assert.equal(await readSessionFile(file), plaintext);
    });
});

test('không có BRIDGE_SESSION_KEY: hành vi như cũ, ghi/đọc plaintext', async () => {
    await withEnv({ BRIDGE_SESSION_KEY: undefined }, async () => {
        const dir = await tempStore();
        const file = path.join(dir, 'c3.json');
        const plaintext = JSON.stringify({ cookie: 'no-key' });

        await writeSessionFile(file, plaintext);

        assert.equal(await fs.readFile(file, 'utf8'), plaintext);
        assert.equal(await readSessionFile(file), plaintext);
    });
});

test('xoay khoá: mã hoá bằng khoá cũ vẫn đọc được qua BRIDGE_SESSION_KEY_PREVIOUS', async () => {
    const dir = await tempStore();
    const file = path.join(dir, 'c4.json');
    const plaintext = JSON.stringify({ cookie: 'rotate-me' });

    await withEnv({ BRIDGE_SESSION_KEY: KEY_A }, async () => {
        await writeSessionFile(file, plaintext);
    });

    await withEnv({ BRIDGE_SESSION_KEY: KEY_B, BRIDGE_SESSION_KEY_PREVIOUS: KEY_A }, async () => {
        assert.equal(await readSessionFile(file), plaintext);
    });
});

test('sai khoá (không có khoá cũ để xoay) thì đọc ném lỗi rõ ràng thay vì trả rác', async () => {
    const dir = await tempStore();
    const file = path.join(dir, 'c5.json');

    await withEnv({ BRIDGE_SESSION_KEY: KEY_A }, async () => {
        await writeSessionFile(file, JSON.stringify({ cookie: 'x' }));
    });

    await withEnv({ BRIDGE_SESSION_KEY: KEY_B }, async () => {
        await assert.rejects(() => readSessionFile(file));
    });
});

test('dữ liệu bị chỉnh sửa (auth tag không khớp) thì đọc ném lỗi', async () => {
    await withEnv({ BRIDGE_SESSION_KEY: KEY_A }, async () => {
        const dir = await tempStore();
        const file = path.join(dir, 'c6.json');
        await writeSessionFile(file, JSON.stringify({ cookie: 'tamper-me' }));

        const envelope = JSON.parse(await fs.readFile(file, 'utf8'));
        // Lật một byte trong ciphertext — GCM phải phát hiện qua auth tag.
        const bytes = Buffer.from(envelope.data, 'base64');
        bytes[0] ^= 0xff;
        envelope.data = bytes.toString('base64');
        await fs.writeFile(file, JSON.stringify(envelope));

        await assert.rejects(() => readSessionFile(file));
    });
});
