import { t } from '../../../i18n';
import { ApiError } from 'dashboard/helper/apiClient';
import type { LibraryStickerChanges, StickerLibraryListing } from './types';

export interface StickerLimits {
    maxLabelLength: number;
    maxKeywords: number;
    maxKeywordLength: number;
    maxStickers: number;
    maxPackNameLength: number;
}

// Trùng giới hạn máy chủ; chỉ dùng khi meta chưa báo.
export const DEFAULT_STICKER_LIMITS: StickerLimits = {
    maxLabelLength: 255,
    maxKeywords: 20,
    maxKeywordLength: 40,
    maxStickers: 120,
    maxPackNameLength: 100,
};

// Bộ đếm ký tự chỉ hiện khi còn dưới ngần này ký tự nữa là chạm giới hạn.
export const COUNTER_VISIBLE_WITHIN = 20;

const positiveOr = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;

export function stickerLimitsFromMeta(meta: Partial<StickerLibraryListing['meta']> | null | undefined): StickerLimits {
    return {
        maxLabelLength: positiveOr(meta?.max_label_length, DEFAULT_STICKER_LIMITS.maxLabelLength),
        maxKeywords: positiveOr(meta?.max_keywords, DEFAULT_STICKER_LIMITS.maxKeywords),
        maxKeywordLength: positiveOr(meta?.max_keyword_length, DEFAULT_STICKER_LIMITS.maxKeywordLength),
        maxStickers: positiveOr(meta?.max_stickers, DEFAULT_STICKER_LIMITS.maxStickers),
        maxPackNameLength: positiveOr(meta?.max_pack_name_length, DEFAULT_STICKER_LIMITS.maxPackNameLength),
    };
}

export function isCounterVisible(length: number, max: number): boolean {
    return max - length < COUNTER_VISIBLE_WITHIN;
}

export interface StickerMetaErrors {
    label?: string;
    keywords?: string;
}

export const hasMetaErrors = (errors: StickerMetaErrors) => Boolean(errors.label || errors.keywords);

export function validateStickerMeta({ label, keywords }: LibraryStickerChanges, limits: StickerLimits): StickerMetaErrors {
    const errors: StickerMetaErrors = {};
    if ((label ?? '').length > limits.maxLabelLength) {
        errors.label = t('STICKER_LIBRARY.ERRORS.LABEL_TOO_LONG', { max: limits.maxLabelLength });
    }
    const tooLong = keywords.find(keyword => keyword.length > limits.maxKeywordLength);
    if (keywords.length > limits.maxKeywords) {
        errors.keywords = t('STICKER_LIBRARY.ERRORS.TOO_MANY_KEYWORDS', { max: limits.maxKeywords });
    } else if (tooLong !== undefined) {
        errors.keywords = t('STICKER_LIBRARY.ERRORS.KEYWORD_TOO_LONG', { keyword: tooLong, max: limits.maxKeywordLength });
    }

    return errors;
}

// Lỗi 422 của máy chủ quy về đúng trường, câu chữ theo giới hạn chứ không in nguyên văn validate.
export function stickerMetaErrorsFromApi(error: unknown, changes: LibraryStickerChanges, limits: StickerLimits): StickerMetaErrors | null {
    if (!(error instanceof ApiError) || error.status !== 422 || !error.body?.errors) return null;
    const fields = Object.keys(error.body.errors);
    const errors: StickerMetaErrors = {};
    if (fields.includes('label')) errors.label = t('STICKER_LIBRARY.ERRORS.LABEL_TOO_LONG', { max: limits.maxLabelLength });
    const keywordField = fields.find(field => field === 'keywords' || field.startsWith('keywords.'));
    if (keywordField === 'keywords') {
        errors.keywords = t('STICKER_LIBRARY.ERRORS.TOO_MANY_KEYWORDS', { max: limits.maxKeywords });
    } else if (keywordField) {
        const keyword = changes.keywords[Number(keywordField.split('.')[1])] ?? '';
        errors.keywords = t('STICKER_LIBRARY.ERRORS.KEYWORD_TOO_LONG', { keyword, max: limits.maxKeywordLength });
    }

    return hasMetaErrors(errors) ? errors : null;
}
