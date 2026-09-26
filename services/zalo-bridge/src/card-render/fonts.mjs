import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Phông có dấu tiếng Việt cho satori — satori KHÔNG đọc được woff2.
 *
 * ĐÃ THỬ trước: đọc `.woff` tách theo subset (latin/latin-ext/vietnamese) thẳng
 * từ `@fontsource/be-vietnam-pro` như widget vẫn dùng cho trình duyệt (không
 * commit font). Gãy thật: subset "vietnamese" của gói này thiếu glyph 'đ' khi
 * satori dựng cùng dòng với ký tự La-tinh thường/số (vd "450.000đ" mất hẳn chữ
 * 'đ') — kiểm bằng bản TTF đầy đủ (không subset) thì đúng, nên lỗi nằm ở chính
 * file subset, không phải cách satori chọn font. Vá bằng cách nạp bản TTF ĐẦY
 * ĐỦ ký tự (không tách subset) — ba nét Regular/SemiBold/Bold đủ cho mọi thẻ,
 * copy cùng nguồn với `resources/fonts/BeVietnamPro/` (OFL.txt đi kèm, xem
 * THIRD_PARTY_NOTICES.md).
 */
const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'fonts');

const FONT_NAME = 'Be Vietnam Pro';

/** @type {Record<number, string>} */
const FONT_FILES_BY_WEIGHT = {
    400: 'BeVietnamPro-Regular.ttf',
    600: 'BeVietnamPro-SemiBold.ttf',
    700: 'BeVietnamPro-Bold.ttf',
};

/** @type {Promise<import('satori').Font[]>|null} */
let cachedFonts = null;

/** @returns {Promise<import('satori').Font[]>} */
export function loadCardFonts() {
    cachedFonts ??= Promise.all(
        Object.entries(FONT_FILES_BY_WEIGHT).map(async ([weight, file]) => ({
            name: FONT_NAME,
            data: await readFile(path.join(FONT_DIR, file)),
            weight: Number(weight),
            style: 'normal',
        })),
    );

    return cachedFonts;
}

export const CARD_FONT_FAMILY = FONT_NAME;
