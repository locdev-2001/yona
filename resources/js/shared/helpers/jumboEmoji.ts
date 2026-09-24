// Tin chỉ gồm vài emoji hiện cỡ lớn, không bong bóng — dùng chung cho hộp thư và widget.

export const JUMBO_EMOJI_MAX_COUNT = 3;

const EMOJI_PARTS = /^[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}‍️⃣#*0-9]+$/u;
const EMOJI_BASE = /[\p{Extended_Pictographic}\p{Regional_Indicator}⃣]/u;

function splitGraphemes(text: string): string[] | null {
    if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null;

    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

    return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

export function isJumboEmoji(content: string | null | undefined): boolean {
    const compact = (content ?? '').replace(/\s+/g, '');
    if (!compact) return false;

    const graphemes = splitGraphemes(compact);
    if (!graphemes || graphemes.length > JUMBO_EMOJI_MAX_COUNT) return false;

    return graphemes.every(grapheme => EMOJI_PARTS.test(grapheme) && EMOJI_BASE.test(grapheme));
}
