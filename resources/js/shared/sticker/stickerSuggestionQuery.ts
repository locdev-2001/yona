// Gợi ý sticker khi gõ, theo cách Zalo: cả nội dung ô nhập là một cụm ngắn trên
// một dòng (vd "haha", "cảm ơn") thì cụm đó là từ khoá; câu dài hay nhiều dòng là
// đang viết tin, không gợi ý. Chọn sticker gợi ý thì sticker thay cho cụm chữ đó.

import { foldSearchText } from 'shared/helpers/searchFold';

export const STICKER_SUGGESTION_MIN_QUERY_LENGTH = 2;
export const STICKER_SUGGESTION_MAX_QUERY_LENGTH = 20;
export const STICKER_SUGGESTION_LIMIT = 8;

export interface KeywordedSticker {
    label: string | null;
    keywords?: string[];
}

export function stickerSuggestionQuery(content: string): string | null {
    const query = content.trim();
    if (query.length < STICKER_SUGGESTION_MIN_QUERY_LENGTH || query.length > STICKER_SUGGESTION_MAX_QUERY_LENGTH) {
        return null;
    }

    return /[\r\n]/.test(query) ? null : query;
}

const WHITESPACE_RUN = /[ \t\n\r\f\v]+/g;
const EDGE_SPACE = /^ | $/g;

// Dạng so khớp: foldSearchText (y như SQL search_fold) rồi gọn khoảng trắng.
export function normalizeStickerTerm(text: string): string {
    return foldSearchText(text).replace(WHITESPACE_RUN, ' ').replace(EDGE_SPACE, '');
}

export const STICKER_KEYWORD_RANK = {
    exact: 0,
    prefix: 1,
    wordPrefix: 2,
} as const;

export type StickerKeywordRank = (typeof STICKER_KEYWORD_RANK)[keyof typeof STICKER_KEYWORD_RANK];

function termRank(term: string, query: string): StickerKeywordRank | null {
    if (term === query) return STICKER_KEYWORD_RANK.exact;
    if (term.startsWith(query)) return STICKER_KEYWORD_RANK.prefix;

    return term.includes(` ${query}`) ? STICKER_KEYWORD_RANK.wordPrefix : null;
}

function rankOfNormalized(sticker: KeywordedSticker, query: string): StickerKeywordRank | null {
    let best: StickerKeywordRank | null = null;
    for (const term of [sticker.label ?? '', ...(sticker.keywords ?? [])]) {
        const rank = termRank(normalizeStickerTerm(term), query);
        if (rank !== null && (best === null || rank < best)) best = rank;
    }

    return best;
}

/**
 * Hạng khớp của cụm đang gõ với nhãn + từ khoá, null khi không khớp hoặc cụm quá
 * ngắn: khớp khi cụm là tiền tố của nhãn hay một từ khoá tính từ đầu một chữ bất
 * kỳ. Cùng luật với StickerKeywordMatch của máy chủ, kiểm chung bằng
 * stickerKeywordMatch.cases.json.
 */
export function stickerKeywordRank(sticker: KeywordedSticker, rawQuery: string): StickerKeywordRank | null {
    const query = normalizeStickerTerm(rawQuery);

    return query.length < STICKER_SUGGESTION_MIN_QUERY_LENGTH ? null : rankOfNormalized(sticker, query);
}

// Lọc tại chỗ theo stickerKeywordRank: hạng tốt lên trước, cùng hạng giữ thứ tự danh mục.
export function matchStickersByKeyword<T extends KeywordedSticker>(
    stickers: readonly T[],
    rawQuery: string,
    limit = STICKER_SUGGESTION_LIMIT,
): T[] {
    const query = normalizeStickerTerm(rawQuery);
    if (query.length < STICKER_SUGGESTION_MIN_QUERY_LENGTH) return [];

    return stickers
        .map((sticker, index) => ({ sticker, index, rank: rankOfNormalized(sticker, query) }))
        .filter((candidate): candidate is { sticker: T; index: number; rank: StickerKeywordRank } => candidate.rank !== null)
        .sort((left, right) => left.rank - right.rank || left.index - right.index)
        .slice(0, limit)
        .map(candidate => candidate.sticker);
}
