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
    writeSessionFile,
} from './session-store-fs.mjs';

async function tempStore() {
    return fs.mkdtemp(path.join(os.tmpdir(), 'zbr-sessions-'));
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
