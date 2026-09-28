import { describe, expect, it } from 'vitest';

import keywordMatchCases from './stickerKeywordMatch.cases.json';
import {
    STICKER_SUGGESTION_LIMIT,
    matchStickersByKeyword,
    normalizeStickerTerm,
    stickerKeywordRank,
    stickerSuggestionQuery,
} from './stickerSuggestionQuery';

const sticker = (id: string, label: string | null, keywords?: string[]) => ({ id, label, keywords });

describe('stickerSuggestionQuery', () => {
    it('cả nội dung ngắn một dòng là từ khoá, bỏ khoảng trắng hai đầu', () => {
        expect(stickerSuggestionQuery('  haha ')).toBe('haha');
        expect(stickerSuggestionQuery('cảm ơn shop')).toBe('cảm ơn shop');
    });

    it('dưới 2 ký tự, quá 20 ký tự hoặc nhiều dòng thì không gợi ý', () => {
        expect(stickerSuggestionQuery('h')).toBeNull();
        expect(stickerSuggestionQuery('   ')).toBeNull();
        expect(stickerSuggestionQuery('shop ơi cho mình hỏi giá')).toBeNull();
        expect(stickerSuggestionQuery('ha\nha')).toBeNull();
    });
});

describe('normalizeStickerTerm', () => {
    it('bỏ dấu tiếng Việt, đ thành d, không phân biệt hoa thường', () => {
        expect(normalizeStickerTerm('  Cảm   Ơn ')).toBe('cam on');
        expect(normalizeStickerTerm('ĐẸP QUÁ')).toBe('dep qua');
        expect(normalizeStickerTerm('Chúc mừng')).toBe('chuc mung');
    });
});

// Máy chủ (StickerKeywordMatch, SQL search_fold) chạy cùng tệp case này.
describe('stickerKeywordRank theo tệp case dùng chung với máy chủ', () => {
    it.each(keywordMatchCases)('$query → $label $keywords = $rank', ({ label, keywords, query, rank }) => {
        expect(stickerKeywordRank({ label, keywords }, query)).toBe(rank);
    });
});

describe('matchStickersByKeyword', () => {
    const catalog = [
        sticker('1', 'Cười ha hả', ['haha', 'hihi']),
        sticker('2', 'Cảm ơn', ['thanks']),
        sticker('3', 'Đẹp quá', []),
        sticker('4', null, ['ha']),
        sticker('5', 'Chào'),
    ];

    it('khớp tiền tố với nhãn hoặc từ khoá, bỏ dấu và không phân biệt hoa thường', () => {
        expect(matchStickersByKeyword(catalog, 'cam').map(item => item.id)).toEqual(['2']);
        expect(matchStickersByKeyword(catalog, 'DEP').map(item => item.id)).toEqual(['3']);
        expect(matchStickersByKeyword(catalog, 'chào').map(item => item.id)).toEqual(['5']);
        expect(matchStickersByKeyword(catalog, 'thank').map(item => item.id)).toEqual(['2']);
    });

    it('khớp đầu một chữ trong nhãn, nhưng không khớp giữa chữ', () => {
        expect(matchStickersByKeyword(catalog, 'qua').map(item => item.id)).toEqual(['3']);
        expect(matchStickersByKeyword(catalog, 'aha')).toEqual([]);
    });

    it('khớp đúng lên trước, cùng hạng giữ thứ tự danh mục', () => {
        expect(matchStickersByKeyword(catalog, 'ha').map(item => item.id)).toEqual(['4', '1']);
    });

    it('từ khoá dưới 2 ký tự sau khi chuẩn hoá thì không lọc', () => {
        expect(matchStickersByKeyword(catalog, ' h ')).toEqual([]);
    });

    it('tối đa 8 sticker', () => {
        const many = Array.from({ length: 12 }, (_, index) => sticker(String(index), `Haha ${index}`));

        expect(matchStickersByKeyword(many, 'haha')).toHaveLength(STICKER_SUGGESTION_LIMIT);
        expect(STICKER_SUGGESTION_LIMIT).toBe(8);
    });
});
