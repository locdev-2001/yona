import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { decryptWithFallback, encryptSessionPayload, isEncryptedEnvelope, loadSessionKeys } from './session-crypto.mjs';

/**
 * 8.1 — Cookie phiên Zalo trong `.sessions/` là TOÀN QUYỀN tài khoản cá nhân của
 * khách: ai đọc được tệp là đăng nhập được. Đây là cổng duy nhất ghi vào kho
 * phiên: thư mục 0700, tệp 0600 — `mode` của `mkdir`/`writeFile` chỉ áp khi TẠO
 * MỚI nên mỗi lần ghi đều `chmod` lại để siết cả tệp cũ.
 *
 * Mã hoá at-rest (session-crypto.mjs): `writeSessionFile` mã hoá khi
 * `BRIDGE_SESSION_KEY` có cấu hình; `readSessionFile` đọc được cả tệp cũ chưa
 * mã hoá (thiếu trường `v`) và tệp mã hoá bằng khoá CŨ (`BRIDGE_SESSION_KEY_PREVIOUS`),
 * rồi tự ghi đè lại bằng khoá hiện tại ngay lần đọc đó — không cần thao tác tay.
 */

export const SESSION_DIR_MODE = 0o700;

export const SESSION_FILE_MODE = 0o600;

export async function ensureSessionDir(dir) {
    await fs.mkdir(dir, { recursive: true, mode: SESSION_DIR_MODE });
    await fs.chmod(dir, SESSION_DIR_MODE).catch(() => {});
}

export async function writeSessionFile(filePath, data) {
    await ensureSessionDir(path.dirname(filePath));
    const { current } = loadSessionKeys();
    const payload = current ? encryptSessionPayload(data, current) : data;
    // Ghi tệp tạm rồi rename: process chết giữa chừng không để lại tệp phiên cụt.
    // randomUUID (không phải pid+timestamp) để hai lần ghi cùng path trong cùng
    // millisecond (di trú-khi-đọc + ghi fire-and-forget khác) không đụng tên tmp.
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    try {
        await fs.writeFile(tmpPath, payload, { encoding: 'utf8', mode: SESSION_FILE_MODE });
        await fs.chmod(tmpPath, SESSION_FILE_MODE).catch(() => {});
        await fs.rename(tmpPath, filePath);
    } catch (error) {
        await fs.rm(tmpPath, { force: true }).catch(() => {});
        throw error;
    }
}

/**
 * Đọc một tệp ghi qua `writeSessionFile`. Tệp bản cũ (JSON thẳng, thiếu trường
 * `v`) hoặc tệp mã hoá bằng khoá CŨ (`usedKey === 'previous'`, xoay khoá) đều
 * được ghi đè lại bằng khoá hiện tại ngay lần đọc đó — chờ xong để lần ghi
 * muộn này không đè lên cookie mới hơn mà caller lưu ngay sau đó. Lỗi ghi chỉ
 * cảnh báo, không chặn luồng đọc.
 */
export async function readSessionFile(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        // Không phải JSON — không phải định dạng của cổng này, trả nguyên văn.
        return raw;
    }
    if (!isEncryptedEnvelope(parsed)) {
        const { current } = loadSessionKeys();
        if (current) {
            await writeSessionFile(filePath, raw).catch((error) => {
                console.warn('zalo-bridge: khong the tu di tru ma hoa phien', filePath, error?.message || error);
            });
        }
        return raw;
    }
    const { plaintext, usedKey } = decryptWithFallback(parsed, loadSessionKeys());
    if (usedKey === 'previous') {
        await writeSessionFile(filePath, plaintext).catch((error) => {
            console.warn('zalo-bridge: khong the tu xoay khoa phien', filePath, error?.message || error);
        });
    }
    return plaintext;
}

/** Bản sao (promote qr→connection) giữ nguyên mode nguồn — siết lại ngay sau khi chép. */
export async function copySessionFile(from, to) {
    await ensureSessionDir(path.dirname(to));
    await fs.copyFile(from, to);
    await fs.chmod(to, SESSION_FILE_MODE).catch(() => {});
}

/**
 * Siết lại toàn bộ kho phiên lúc boot — tệp do bản bridge cũ ghi ra vẫn đang 664.
 * Không ném lỗi: kho phiên hỏng quyền không được phép chặn bridge khởi động.
 *
 * @returns {Promise<number>} số tệp đã đổi quyền
 */
export async function hardenSessionStore(dir) {
    await ensureSessionDir(dir);

    let entries = [];
    try {
        entries = await fs.readdir(dir);
    } catch {
        return 0;
    }

    let hardened = 0;
    for (const entry of entries) {
        const target = path.join(dir, entry);
        try {
            const stat = await fs.stat(target);
            if (!stat.isFile()) {
                continue;
            }
            if ((stat.mode & 0o777) !== SESSION_FILE_MODE) {
                await fs.chmod(target, SESSION_FILE_MODE);
                hardened += 1;
            }
        } catch {
            // tệp biến mất giữa chừng hoặc không đủ quyền — bỏ qua
        }
    }

    return hardened;
}
