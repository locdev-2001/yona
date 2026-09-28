import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';
import { setLocale } from '../../../i18n';
import { DEFAULT_STICKER_LIMITS, isCounterVisible, stickerLimitsFromMeta, stickerMetaErrorsFromApi, validateStickerMeta } from './stickerLimits';

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

describe('giới hạn sticker', () => {
    it('đọc meta của máy chủ, khoá thiếu hoặc sai thì dùng mặc định an toàn', () => {
        expect(stickerLimitsFromMeta(undefined)).toEqual(DEFAULT_STICKER_LIMITS);
        expect(stickerLimitsFromMeta({ max_keywords: 5, max_label_length: -1, max_stickers: 1.5 })).toEqual({ ...DEFAULT_STICKER_LIMITS, maxKeywords: 5 });
    });

    it('kiểm nhãn, số từ khoá và độ dài từ khoá', () => {
        const limits = { ...DEFAULT_STICKER_LIMITS, maxLabelLength: 3, maxKeywords: 2, maxKeywordLength: 4 };
        expect(validateStickerMeta({ label: 'abcd', keywords: [] }, limits)).toEqual({ label: 'Nhãn tối đa 3 ký tự' });
        expect(validateStickerMeta({ label: null, keywords: ['a', 'b', 'c'] }, limits)).toEqual({ keywords: 'Tối đa 2 từ khoá' });
        expect(validateStickerMeta({ label: null, keywords: ['hahaha'] }, limits)).toEqual({ keywords: 'Từ khoá «hahaha» dài quá 4 ký tự' });
        expect(validateStickerMeta({ label: 'ok', keywords: ['ok'] }, limits)).toEqual({});
    });

    it('lỗi 422 quy về đúng trường; lỗi khác trả null để báo chung', () => {
        const changes = { label: 'x', keywords: ['a', 'rất dài'] };
        expect(stickerMetaErrorsFromApi(new ApiError(422, { errors: { 'keywords.1': ['raw'] } }), changes, DEFAULT_STICKER_LIMITS)).toEqual({
            keywords: 'Từ khoá «rất dài» dài quá 40 ký tự',
        });
        expect(stickerMetaErrorsFromApi(new ApiError(422, { errors: { keywords: ['raw'], label: ['raw'] } }), changes, DEFAULT_STICKER_LIMITS)).toEqual({
            label: 'Nhãn tối đa 255 ký tự',
            keywords: 'Tối đa 20 từ khoá',
        });
        expect(stickerMetaErrorsFromApi(new ApiError(500, null), changes, DEFAULT_STICKER_LIMITS)).toBeNull();
    });

    it('bộ đếm chỉ hiện khi còn dưới 20 ký tự', () => {
        expect(isCounterVisible(80, 100)).toBe(false);
        expect(isCounterVisible(81, 100)).toBe(true);
    });
});
