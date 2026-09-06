/**
 * reaction-icons.mjs — mã cảm xúc Zalo (`Reactions` trong
 * `node_modules/zca-js/dist/models/Reaction.d.ts`) ↔ emoji.
 *
 * Bảng này là bản soi gương của `app/Services/Zalo/ReactionIcons.php` (chiều
 * mã→emoji, dùng khi tin đến). Chiều ngược lại sống ở đây vì lõi Laravel chỉ
 * biết emoji: `POST /personal-messages/reaction` nhận emoji HOẶC mã zca, bridge
 * dịch sang mã trước khi gọi `addReaction`.
 *
 * Vì sao phải chặn mã lạ: `addReaction` gặp mã không nhận ra thì đặt `rType = -1`
 * — đó là đường GỠ cảm xúc, tức là gõ nhầm emoji sẽ âm thầm xoá cảm xúc thay vì
 * báo lỗi. Nên mã không tra được phải trả `bad_request`.
 */

/** Mã zca → emoji. Thứ tự quan trọng: chiều ngược lấy mã ĐẦU TIÊN của mỗi emoji. */
const EMOJI_BY_CODE = {
    '/-heart': '❤️',
    '/-strong': '👍',
    ':>': '😆',
    ':o': '😮',
    ':-((': '😢',
    ':-h': '😡',
    ':-*': '😘',
    ":')": '😂',
    '/-shit': '💩',
    '/-rose': '🌹',
    '/-break': '💔',
    '/-weak': '👎',
    ';xx': '😍',
    ';-/': '😕',
    ';-)': '😉',
    '/-fade': '🥀',
    '/-li': '☀️',
    '/-bd': '🎂',
    '/-bome': '💣',
    '/-ok': '👌',
    '/-v': '✌️',
    '/-thanks': '🙏',
    '/-punch': '👊',
    '/-share': '🤝',
    '_()_': '🙏',
    '/-no': '🚫',
    '/-bad': '👎',
    '/-loveu': '🥰',
    '--b': '😔',
    ':((': '😭',
    'x-)': '😎',
    '8-)': '🤓',
    ';-d': '😃',
    'b-)': '😎',
    ':--|': '😐',
    'p-(': '😞',
    ':-bye': '👋',
    '|-)': '😴',
    ':wipe': '😅',
    ':-dig': '⛏️',
    '&-(': '😩',
    ':handclap': '👏',
    '>-|': '😠',
    ':-f': '🪑',
    ':-l': '🪑',
    ':-r': '🪑',
    ';-x': '🤐',
    ':-o': '😲',
    ';-s': '😳',
    ';-a': '😨',
    ':-<': '☹️',
    ':))': '😂',
    '$-)': '🤑',
    '/-beer': '🍺',
};

/** Bỏ variation selector — '❤️' (có U+FE0F) và '❤' phải tra ra cùng một mã. */
function normalizeEmoji(value) {
    return String(value ?? '').replace(/️/g, '').trim();
}

const CODE_BY_EMOJI = (() => {
    const map = new Map();
    for (const [code, emoji] of Object.entries(EMOJI_BY_CODE)) {
        const key = normalizeEmoji(emoji);
        if (!map.has(key)) {
            map.set(key, code);
        }
    }
    return map;
})();

/** `Reactions.NONE` = chuỗi rỗng → gỡ cảm xúc. */
export const REACTION_NONE = '';

/**
 * @param {unknown} icon emoji ('👍') hoặc mã zca ('/-strong'); rỗng/'none' = gỡ
 * @returns {string | null} mã zca, hoặc null khi không tra được
 */
export function zcaReactionCode(icon) {
    const raw = String(icon ?? '').trim();
    if (raw === '' || raw.toLowerCase() === 'none') {
        return REACTION_NONE;
    }
    if (Object.prototype.hasOwnProperty.call(EMOJI_BY_CODE, raw)) {
        return raw;
    }
    return CODE_BY_EMOJI.get(normalizeEmoji(raw)) ?? null;
}

/** Chiều đọc — dùng khi cần hiển thị lại mã zca dưới dạng emoji. */
export function reactionEmoji(code) {
    const raw = String(code ?? '');
    return EMOJI_BY_CODE[raw] ?? raw;
}
