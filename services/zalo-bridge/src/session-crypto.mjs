import crypto from 'node:crypto';

/**
 * Mã hoá at-rest AES-256-GCM cho kho phiên (`.sessions/`). `BRIDGE_SESSION_KEY`
 * = 32 byte base64 hoặc hex. Định dạng tệp: `{v:1, iv, tag, data}`, mỗi trường
 * base64; thiếu trường `v` ⇒ tệp bản cũ (plaintext), xem `session-store-fs.mjs`.
 * `BRIDGE_SESSION_KEY_PREVIOUS` (tuỳ chọn) chỉ dùng để GIẢI MÃ khi xoay khoá.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
export const SESSION_FORMAT_VERSION = 1;

/**
 * Chấp nhận base64 (44 ký tự, có thể có padding `=`) hoặc hex (64 ký tự) — cả hai
 * đều phải giải mã đúng 32 byte. Trả `null` nếu không hợp lệ (caller quyết định
 * có ném lỗi hay không).
 */
export function parseSessionKey(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
        return Buffer.from(trimmed, 'hex');
    }
    try {
        const decoded = Buffer.from(trimmed, 'base64');
        if (decoded.length === KEY_LENGTH) {
            return decoded;
        }
    } catch {
        // rơi xuống return null bên dưới
    }
    return null;
}

function requireParsedKey(raw, envName) {
    const key = parseSessionKey(raw);
    if (!key) {
        throw new Error(
            `${envName} khong hop le: can dung 32 byte dang base64 hoac hex (vi du: openssl rand -base64 32)`
        );
    }
    return key;
}

/**
 * Nạp cặp khoá hiện tại/cũ từ env. Ném lỗi khi biến ĐƯỢC ĐẶT nhưng sai định dạng
 * (lỗi cấu hình rõ ràng — chặn ngay, không âm thầm chạy tiếp với khoá hỏng).
 * Biến vắng mặt hoàn toàn thì trả `null` cho phần đó — caller (boot ở index.mjs)
 * quyết định có cảnh báo hay không tuỳ NODE_ENV.
 */
export function loadSessionKeys(env = process.env) {
    const rawCurrent = env.BRIDGE_SESSION_KEY || '';
    const rawPrevious = env.BRIDGE_SESSION_KEY_PREVIOUS || '';
    return {
        current: rawCurrent ? requireParsedKey(rawCurrent, 'BRIDGE_SESSION_KEY') : null,
        previous: rawPrevious ? requireParsedKey(rawPrevious, 'BRIDGE_SESSION_KEY_PREVIOUS') : null,
    };
}

export function encryptSessionPayload(plaintext, key) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        v: SESSION_FORMAT_VERSION,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: data.toString('base64'),
    });
}

/** true nếu `parsed` là JSON đã qua `encryptSessionPayload` (không phải tệp cookie plaintext). */
export function isEncryptedEnvelope(parsed) {
    return (
        Boolean(parsed) &&
        typeof parsed === 'object' &&
        parsed.v === SESSION_FORMAT_VERSION &&
        typeof parsed.iv === 'string' &&
        typeof parsed.tag === 'string' &&
        typeof parsed.data === 'string'
    );
}

function decryptSessionPayload(envelope, key) {
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    const data = Buffer.from(envelope.data, 'base64');
    if (tag.length !== AUTH_TAG_LENGTH) {
        throw new Error(`auth tag phai dai ${AUTH_TAG_LENGTH} byte, nhan duoc ${tag.length}`);
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Thử khoá hiện tại trước, hỏng thì thử khoá cũ (xoay khoá qua
 * `BRIDGE_SESSION_KEY_PREVIOUS`). Sai khoá hoặc dữ liệu bị chỉnh sửa (auth tag
 * GCM không khớp) đều rơi vào đây — không phân biệt được hai trường hợp, và
 * không cần phân biệt: cả hai đều nghĩa là "không đọc được, phải quét QR lại".
 *
 * Trả kèm `usedKey` ('current'|'previous') để caller biết có cần ghi đè lại
 * bằng khoá hiện tại hay không (giải mã được bằng khoá CŨ nghĩa là tệp trên
 * đĩa vẫn đang mã hoá bằng khoá cũ, chưa xoay).
 */
export function decryptWithFallback(envelope, { current, previous } = {}) {
    const attempts = [
        { key: current, usedKey: 'current' },
        { key: previous, usedKey: 'previous' },
    ].filter((attempt) => attempt.key);
    if (attempts.length === 0) {
        throw new Error('khong co BRIDGE_SESSION_KEY de giai ma phien da ma hoa');
    }
    let lastError = null;
    for (const { key, usedKey } of attempts) {
        try {
            return { plaintext: decryptSessionPayload(envelope, key), usedKey };
        } catch (error) {
            lastError = error;
        }
    }
    throw new Error(`giai ma phien that bai (sai khoa hoac du lieu bi thay doi): ${lastError?.message || lastError}`);
}
