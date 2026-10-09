import { useId, useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent, RefObject } from 'react';

import { t } from '../../../i18n';
import { parseKeywordInput } from './stickerKeywords';
import { isCounterVisible } from './stickerLimits';
import type { StickerLimits, StickerMetaErrors } from './stickerLimits';
import { INPUT_CLASS, INPUT_ERROR_CLASS } from './stickerLibraryUi';
import type { LibrarySticker, LibraryStickerChanges } from './types';

// Bản nháp Nhãn + Từ khoá; `keywordInput` là chữ đang gõ chưa thành chip.
export interface StickerMetaDraft {
    label: string;
    keywords: string[];
    keywordInput: string;
}

export const draftFromSticker = (sticker: Pick<LibrarySticker, 'label' | 'keywords'>): StickerMetaDraft => ({
    label: sticker.label ?? '',
    keywords: [...sticker.keywords],
    keywordInput: '',
});

export function changesFromDraft(draft: StickerMetaDraft): LibraryStickerChanges {
    return {
        label: draft.label.trim() || null,
        keywords: parseKeywordInput([...draft.keywords, draft.keywordInput].join(',')),
    };
}

export function isDraftChanged(draft: StickerMetaDraft, sticker: Pick<LibrarySticker, 'label' | 'keywords'>): boolean {
    const changes = changesFromDraft(draft);

    return changes.label !== (sticker.label?.trim() || null) || changes.keywords.join('\u0000') !== sticker.keywords.join('\u0000');
}

interface StickerMetaFieldsProps {
    draft: StickerMetaDraft;
    limits: StickerLimits;
    errors: StickerMetaErrors;
    disabled?: boolean;
    labelRef?: RefObject<HTMLInputElement | null>;
    onChange: (draft: StickerMetaDraft, changedField: keyof StickerMetaErrors) => void;
}

export default function StickerMetaFields({ draft, limits, errors, disabled = false, labelRef, onChange }: StickerMetaFieldsProps) {
    const fieldId = useId();
    const keywordInputRef = useRef<HTMLInputElement>(null);
    const labelErrorId = `${fieldId}-label-error`;
    const keywordsHintId = `${fieldId}-keywords-hint`;
    const keywordsErrorId = `${fieldId}-keywords-error`;
    const isKeywordLimitReached = draft.keywords.length >= limits.maxKeywords;

    const setKeywords = (keywords: string[], keywordInput: string) =>
        onChange({ ...draft, keywords: keywords.slice(0, limits.maxKeywords), keywordInput }, 'keywords');

    const commitKeywordInput = (text = draft.keywordInput) => {
        if (!text.trim()) return;
        setKeywords(parseKeywordInput([...draft.keywords, text].join(',')), '');
    };

    const onKeywordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            commitKeywordInput();
        } else if (event.key === 'Backspace' && draft.keywordInput === '' && draft.keywords.length > 0) {
            setKeywords(draft.keywords.slice(0, -1), '');
        }
    };

    const onKeywordPaste = (event: ClipboardEvent<HTMLInputElement>) => {
        const pasted = event.clipboardData.getData('text');
        if (!pasted.includes(',')) return;
        event.preventDefault();
        commitKeywordInput(`${draft.keywordInput}${pasted}`);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`${fieldId}-label`} className="m-0 text-sm font-medium leading-5 text-n-slate-12">
                        {t('STICKER_LIBRARY.LABEL')}
                    </label>
                    {isCounterVisible(draft.label.length, limits.maxLabelLength) ? (
                        <span className="text-xs text-n-slate-11">
                            {draft.label.length}/{limits.maxLabelLength}
                        </span>
                    ) : null}
                </div>
                <input
                    ref={labelRef}
                    id={`${fieldId}-label`}
                    type="text"
                    className={`${INPUT_CLASS} ${errors.label ? INPUT_ERROR_CLASS : ''}`}
                    value={draft.label}
                    disabled={disabled}
                    enterKeyHint="next"
                    aria-invalid={errors.label ? true : undefined}
                    aria-describedby={errors.label ? labelErrorId : undefined}
                    onChange={event => onChange({ ...draft, label: event.target.value }, 'label')}
                    onKeyDown={event => {
                        if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
                            event.preventDefault();
                            keywordInputRef.current?.focus();
                        }
                    }}
                />
                {errors.label ? (
                    <p id={labelErrorId} className="m-0 text-xs text-n-ruby-11">
                        {errors.label}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`${fieldId}-keywords`} className="m-0 text-sm font-medium leading-5 text-n-slate-12">
                        {t('STICKER_LIBRARY.KEYWORDS')}
                    </label>
                    <span className="text-xs text-n-slate-11">
                        {draft.keywords.length}/{limits.maxKeywords}
                    </span>
                </div>
                <div
                    className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg p-1.5 md:min-h-9 ${
                        errors.keywords ? 'field-invalid' : 'field-surface'
                    }`}
                    onClick={() => keywordInputRef.current?.focus()}
                >
                    {draft.keywords.map((keyword, index) => (
                        <span
                            key={keyword}
                            className={`inline-flex h-7 max-w-full items-center gap-1 rounded-md pl-2 text-sm text-n-slate-12 ${
                                keyword.length > limits.maxKeywordLength ? 'bg-n-ruby-3 outline outline-1 -outline-offset-1 outline-n-ruby-8' : 'bg-n-surface-panel'
                            }`}
                        >
                            <span className="truncate">{keyword}</span>
                            <button
                                type="button"
                                disabled={disabled}
                                aria-label={t('STICKER_LIBRARY.REMOVE_KEYWORD', { keyword })}
                                className="reset-base inline-flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-n-slate-11 [@media(hover:hover)]:hover:text-n-slate-12"
                                onClick={event => {
                                    event.stopPropagation();
                                    setKeywords(
                                        draft.keywords.filter((_, keywordIndex) => keywordIndex !== index),
                                        draft.keywordInput,
                                    );
                                }}
                            >
                                <span className="i-lucide-x size-3.5" aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                    <input
                        ref={keywordInputRef}
                        id={`${fieldId}-keywords`}
                        type="text"
                        className="reset-base m-0 h-8 min-w-[8rem] flex-1 border-0 bg-transparent px-1.5 py-0 text-base text-n-slate-12 shadow-none outline-none placeholder:text-n-slate-10 focus:outline-none md:text-sm"
                        value={draft.keywordInput}
                        disabled={disabled || isKeywordLimitReached}
                        placeholder={isKeywordLimitReached ? t('STICKER_LIBRARY.KEYWORDS_FULL') : t('STICKER_LIBRARY.KEYWORD_CHIP_PLACEHOLDER')}
                        enterKeyHint="done"
                        aria-invalid={errors.keywords ? true : undefined}
                        aria-describedby={errors.keywords ? `${keywordsErrorId} ${keywordsHintId}` : keywordsHintId}
                        onChange={event => onChange({ ...draft, keywordInput: event.target.value }, 'keywords')}
                        onKeyDown={onKeywordKeyDown}
                        onPaste={onKeywordPaste}
                        onBlur={() => commitKeywordInput()}
                    />
                </div>
                {errors.keywords ? (
                    <p id={keywordsErrorId} className="m-0 text-xs text-n-ruby-11">
                        {errors.keywords}
                    </p>
                ) : null}
                <p id={keywordsHintId} className="m-0 text-xs text-n-slate-11">
                    {t('STICKER_LIBRARY.KEYWORDS_HINT')}
                </p>
            </div>
        </div>
    );
}
