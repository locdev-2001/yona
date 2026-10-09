import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import StickerImage from 'shared/sticker/StickerImage';
import { useStickerDisplaySize } from 'shared/sticker/stickerDisplaySize';
import StickerMetaFields, { changesFromDraft, draftFromSticker, isDraftChanged } from './StickerMetaFields';
import type { StickerMetaDraft } from './StickerMetaFields';
import { hasMetaErrors, validateStickerMeta } from './stickerLimits';
import type { StickerLimits, StickerMetaErrors } from './stickerLimits';
import { CHECKERBOARD_STYLE, IconButton, StickerButton } from './stickerLibraryUi';
import type { StickerMoveTarget } from './StickerGrid';
import { isAnimatedSticker } from './StickerTile';
import { hasFailedReedit } from './types';
import type { LibrarySticker, LibraryStickerChanges } from './types';

// Ngăn chi tiết rộng 320px: ảnh xem trước không vượt cỡ này.
const PREVIEW_MAX_PX = 128;

export type StickerSaveResult = { ok: true } | { ok: false; errors: StickerMetaErrors | null };

interface StickerDetailPanelProps {
    sticker: LibrarySticker;
    index: number;
    total: number;
    limits: StickerLimits;
    saving: boolean;
    deleting: boolean;
    reorderEnabled: boolean;
    showHeaderClose: boolean;
    onSave: (changes: LibraryStickerChanges) => Promise<StickerSaveResult>;
    onDirtyChange: (dirty: boolean) => void;
    onRequestClose: () => void;
    onMove: (target: StickerMoveTarget) => void;
    onDelete: () => void;
    // Đang tải ảnh gốc để mở trình chỉnh.
    reediting: boolean;
    onReedit: () => void;
}

// Một component cho cả cột 320px, ngăn phủ và bottom sheet. Bản nháp giữ riêng theo sticker,
// nên lượt poll cập nhật trạng thái không ghi đè chữ đang gõ.
export default function StickerDetailPanel({
    sticker,
    index,
    total,
    limits,
    saving,
    deleting,
    reorderEnabled,
    showHeaderClose,
    onSave,
    onDirtyChange,
    onRequestClose,
    onMove,
    onDelete,
    reediting,
    onReedit,
}: StickerDetailPanelProps) {
    const previewSize = Math.min(useStickerDisplaySize(), PREVIEW_MAX_PX);
    const [draft, setDraft] = useState<StickerMetaDraft>(() => draftFromSticker(sticker));
    const [baseline, setBaseline] = useState(() => ({ label: sticker.label, keywords: sticker.keywords }));
    const [errors, setErrors] = useState<StickerMetaErrors>({});
    const labelRef = useRef<HTMLInputElement>(null);

    const isDirty = isDraftChanged(draft, baseline);
    const clientErrors = validateStickerMeta(changesFromDraft(draft), limits);
    const canSave = isDirty && !hasMetaErrors(clientErrors) && !saving;

    useEffect(() => {
        labelRef.current?.focus();
    }, []);

    useEffect(() => {
        onDirtyChange(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

    const save = async () => {
        const changes = changesFromDraft(draft);
        const invalid = validateStickerMeta(changes, limits);
        if (hasMetaErrors(invalid)) {
            setErrors(invalid);
            return;
        }
        if (!isDirty || saving) return;
        const result = await onSave(changes);
        if (result.ok) {
            setBaseline({ label: changes.label, keywords: changes.keywords });
            setDraft({ label: changes.label ?? '', keywords: changes.keywords, keywordInput: '' });
            setErrors({});
        } else if (result.errors) {
            setErrors(result.errors);
        }
    };

    const cancel = () => {
        setDraft(draftFromSticker(baseline));
        setErrors({});
        onDirtyChange(false);
        onRequestClose();
    };

    const shownErrors: StickerMetaErrors = {
        label: errors.label ?? (draft.label.length > limits.maxLabelLength ? clientErrors.label : undefined),
        keywords: errors.keywords ?? clientErrors.keywords,
    };
    const source = sticker.image_url ?? sticker.static_url;

    return (
        <div
            className="flex h-full min-h-0 flex-col"
            onKeyDown={event => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    void save();
                }
            }}
        >
            <div className="flex items-start gap-3 px-5 pt-4">
                <div
                    className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
                    style={{ ...CHECKERBOARD_STYLE, width: previewSize + 16, height: previewSize + 16 }}
                >
                    {source ? <StickerImage src={source} alt={sticker.label ?? ''} style={{ width: previewSize }} /> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
                    <p className="m-0 text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.DETAIL_POSITION', { index: index + 1, total })}</p>
                    <p className="m-0 text-xs text-n-slate-11">
                        {isAnimatedSticker(sticker)
                            ? t('STICKER_LIBRARY.DETAIL_ANIMATED', { frames: sticker.frames ?? 1 })
                            : t('STICKER_LIBRARY.DETAIL_STATIC')}{' '}
                        · {t(`STICKER_LIBRARY.STATUS.${sticker.status}`)}
                    </p>
                </div>
                {showHeaderClose ? <IconButton icon="i-lucide-x" label={t('STICKER_LIBRARY.CLOSE')} onClick={onRequestClose} /> : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
                {sticker.status === 'failed' && sticker.failure_message ? (
                    <p role="alert" className="m-0 rounded-lg bg-n-ruby-3 p-3 text-sm text-n-ruby-11">
                        {sticker.failure_message}
                    </p>
                ) : null}
                {hasFailedReedit(sticker) ? (
                    <p role="status" className="m-0 rounded-lg bg-n-amber-3 p-3 text-sm text-n-amber-11">
                        {t('STICKER_LIBRARY.REEDIT_FAILED', { reason: sticker.failure_message ?? '' })}
                    </p>
                ) : null}
                <StickerMetaFields
                    draft={draft}
                    limits={limits}
                    errors={shownErrors}
                    disabled={saving}
                    labelRef={labelRef}
                    onChange={(next, field) => {
                        setDraft(next);
                        setErrors(current => ({ ...current, [field]: undefined }));
                    }}
                />
                <div className="flex flex-col gap-1 pt-4">
                    <StickerButton
                        tone="ghost"
                        size="sheet"
                        icon="i-lucide-crop"
                        className="!justify-start"
                        disabled={!sticker.has_original || sticker.status === 'processing'}
                        busy={reediting}
                        title={sticker.has_original ? undefined : t('STICKER_LIBRARY.REEDIT_NO_ORIGINAL')}
                        onClick={onReedit}
                    >
                        {t('STICKER_LIBRARY.REEDIT')}
                    </StickerButton>
                    <StickerButton tone="ghost" size="sheet" icon="i-lucide-arrow-up-to-line" className="!justify-start" disabled={!reorderEnabled || index === 0} onClick={() => onMove('first')}>
                        {t('STICKER_LIBRARY.MOVE_FIRST')}
                    </StickerButton>
                    <StickerButton
                        tone="ghost"
                        size="sheet"
                        icon="i-lucide-arrow-down-to-line"
                        className="!justify-start"
                        disabled={!reorderEnabled || index === total - 1}
                        onClick={() => onMove('last')}
                    >
                        {t('STICKER_LIBRARY.MOVE_LAST')}
                    </StickerButton>
                    <StickerButton tone="ghost-danger" size="sheet" icon="i-lucide-trash-2" className="!justify-start" busy={deleting} onClick={onDelete}>
                        {t('STICKER_LIBRARY.DELETE_STICKER')}
                    </StickerButton>
                </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
                <StickerButton tone="secondary" size="sheet" className="flex-1 md:flex-none" onClick={cancel}>
                    {t('STICKER_LIBRARY.CANCEL')}
                </StickerButton>
                <StickerButton tone="primary" size="sheet" className="flex-1 md:flex-none" disabled={!canSave} busy={saving} onClick={() => void save()}>
                    {t('STICKER_LIBRARY.SAVE')}
                </StickerButton>
            </div>
        </div>
    );
}
