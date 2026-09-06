import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 8.1 — Cookie phiên Zalo trong `.sessions/` là TOÀN QUYỀN tài khoản cá nhân của
 * khách: ai đọc được tệp là đăng nhập được. Trước đây thư mục 775 / tệp 664, tức
 * mọi user trên máy đều đọc. Đây là cổng duy nhất ghi vào kho phiên: thư mục 0700,
 * tệp 0600.
 *
 * `mode` của `mkdir`/`writeFile` chỉ áp khi TẠO MỚI (và còn bị umask trừ đi), nên
 * mỗi lần ghi đều `chmod` lại — tệp cũ tạo từ bản trước cũng được siết.
 */

export const SESSION_DIR_MODE = 0o700;

export const SESSION_FILE_MODE = 0o600;

export async function ensureSessionDir(dir) {
    await fs.mkdir(dir, { recursive: true, mode: SESSION_DIR_MODE });
    await fs.chmod(dir, SESSION_DIR_MODE).catch(() => {});
}

export async function writeSessionFile(filePath, data) {
    await ensureSessionDir(path.dirname(filePath));
    await fs.writeFile(filePath, data, { encoding: 'utf8', mode: SESSION_FILE_MODE });
    await fs.chmod(filePath, SESSION_FILE_MODE).catch(() => {});
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
