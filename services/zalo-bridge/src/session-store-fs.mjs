import fs from 'node:fs/promises';
import path from 'node:path';
import { decryptWithFallback, encryptSessionPayload, isEncryptedEnvelope, loadSessionKeys } from './session-crypto.mjs';

/**
 * 8.1 — Cookie phiên Zalo trong `.sessions/` là TOÀN QUYỀN tài khoản cá nhân của
 * khách: ai đọc được tệp là đăng nhập được. Trước đây thư mục 775 / tệp 664, tức
 * mọi user trên máy đều đọc. Đây là cổng duy nhất ghi vào kho phiên: thư mục 0700,
 * tệp 0600.
 *
 * `mode` của `mkdir`/`writeFile` chỉ áp khi TẠO MỚI (và còn bị umask trừ đi), nên
 * mỗi lần ghi đều `chmod` lại — tệp cũ tạo từ bản trước cũng được siết.
 *
 * Mã hoá at-rest (session-crypto.mjs): quyền 0600 chỉ chặn user khác trên cùng
 * máy, không chặn backup/ảnh đĩa. `writeSessionFile` mã hoá khi `BRIDGE_SESSION_KEY`
 * có cấu hình; `readSessionFile` đọc được cả tệp cũ chưa mã hoá (thiếu trường `v`)
 * và tự ghi đè lại dạng đã mã hoá ngay lần đọc đó — không cần thao tác tay để di trú.
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
    await fs.writeFile(filePath, payload, { encoding: 'utf8', mode: SESSION_FILE_MODE });
    await fs.chmod(filePath, SESSION_FILE_MODE).catch(() => {});
}

/**
 * Đọc một tệp ghi qua `writeSessionFile`. Tệp mã hoá ⇒ giải mã (khoá hiện tại,
 * xoay khoá qua khoá cũ); tệp bản cũ (JSON thẳng, thiếu trường `v`) ⇒ trả nguyên
 * văn VÀ, nếu đã có khoá cấu hình, ghi đè lại dạng mã hoá ngay (best-effort, lỗi
 * ghi không được chặn luồng đọc đang chạy).
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
            writeSessionFile(filePath, raw).catch((error) => {
                console.warn('zalo-bridge: khong the tu di tru ma hoa phien', filePath, error?.message || error);
            });
        }
        return raw;
    }
    return decryptWithFallback(parsed, loadSessionKeys());
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
