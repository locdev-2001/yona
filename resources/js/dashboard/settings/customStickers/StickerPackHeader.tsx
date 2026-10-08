import { useEffect, useId, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Loader from 'shared/components/loader/Loader';
import InlineInput from 'dashboard/components-next/inline-input/InlineInput';
import { isCounterVisible } from './stickerLimits';
import { PackNameSheet } from './StickerPackList';
import { Badge, IconButton, InfoTip, Menu, StickerButton, Switch } from './stickerLibraryUi';
import type { MenuItem } from './stickerLibraryUi';
import type { LibraryStickerPack } from './types';

const SAVED_MARK_MS = 1500;

interface StickerPackHeaderProps {
    pack: LibraryStickerPack;
    packs: LibraryStickerPack[];
    stickerCount: number;
    readyCount: number;
    failedCount: number;
    maxStickers: number;
    maxNameLength: number;
    imageSize: number;
    uploadLimit: string;
    isMobile: boolean;
    isRenaming: boolean;
    isPublishing: boolean;
    canAddSticker: boolean;
    onRename: (name: string) => Promise<boolean>;
    onTogglePublished: (published: boolean) => void;
    onAddSticker: () => void;
    onDeletePack: () => void;
    moveLabel: string | null;
    onMovePack: () => void;
    onFailedFirst: () => void;
    onStartSort: () => void;
    onBack: () => void;
}

export default function StickerPackHeader({
    pack,
    packs,
    stickerCount,
    readyCount,
    failedCount,
    maxStickers,
    maxNameLength,
    imageSize,
    uploadLimit,
    isMobile,
    isRenaming,
    isPublishing,
    canAddSticker,
    onRename,
    onTogglePublished,
    onAddSticker,
    onDeletePack,
    moveLabel,
    onMovePack,
    onFailedFirst,
    onStartSort,
    onBack,
}: StickerPackHeaderProps) {
    const [nameDraft, setNameDraft] = useState(pack.name);
    const [showSaved, setShowSaved] = useState(false);
    const [isRenameSheetOpen, setRenameSheetOpen] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const discardOnBlur = useRef(false);
    const publishHintId = useId();

    // Bản nháp tên chỉ đặt lại khi đổi bộ; thao tác khác trên bộ không xoá chữ đang gõ.
    useEffect(() => {
        setNameDraft(pack.name);
        setShowSaved(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pack.id]);

    useEffect(() => {
        if (!showSaved) return undefined;
        const timer = window.setTimeout(() => setShowSaved(false), SAVED_MARK_MS);

        return () => window.clearTimeout(timer);
    }, [showSaved]);

    const commitRename = async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed || trimmed === pack.name) {
            setNameDraft(pack.name);
            return;
        }
        if (await onRename(trimmed)) {
            setNameDraft(trimmed);
            setShowSaved(true);
            setRenameSheetOpen(false);
        }
    };

    const startRename = () => (isMobile ? setRenameSheetOpen(true) : nameInputRef.current?.focus());
    const canPublish = readyCount > 0 || pack.published;

    const menuItems: MenuItem[] = [
        { key: 'rename', label: t('STICKER_LIBRARY.RENAME'), icon: 'i-lucide-pencil', onSelect: startRename },
        ...(isMobile
            ? [{ key: 'sort', label: t('STICKER_LIBRARY.SORT'), icon: 'i-lucide-arrow-up-down', disabled: stickerCount < 2, onSelect: onStartSort }]
            : [{ key: 'failed-first', label: t('STICKER_LIBRARY.FAILED_FIRST'), icon: 'i-lucide-triangle-alert', disabled: failedCount === 0, onSelect: onFailedFirst }]),
        ...(moveLabel ? [{ key: 'move', label: moveLabel, icon: 'i-lucide-arrow-right-left', onSelect: onMovePack }] : []),
        { key: 'delete', label: t('STICKER_LIBRARY.DELETE_PACK'), icon: 'i-lucide-trash-2', danger: true, separatorBefore: true, onSelect: onDeletePack },
    ];

    const statusBadge = <Badge tone={pack.published ? 'success' : 'neutral'}>{pack.published ? t('STICKER_LIBRARY.PUBLISHED') : t('STICKER_LIBRARY.DRAFT')}</Badge>;
    const publishSwitch = (
        <Switch
            checked={pack.published}
            label={t('STICKER_LIBRARY.PUBLISH')}
            disabled={!canPublish}
            busy={isPublishing}
            describedBy={canPublish ? undefined : publishHintId}
            onChange={onTogglePublished}
        />
    );
    const publishHint = canPublish ? null : (
        <p id={publishHintId} className="m-0 text-xs text-n-slate-11">
            {t('STICKER_LIBRARY.PUBLISH_NEEDS_STICKER')}
        </p>
    );
    const summary = (
        <div className="flex items-center gap-1 text-xs text-n-slate-11">
            <span>{t('STICKER_LIBRARY.PACK_SUMMARY', { count: stickerCount, max: maxStickers, size: imageSize })}</span>
            <InfoTip label={t('STICKER_LIBRARY.INFO_LABEL')} text={t('STICKER_LIBRARY.UPLOAD_INFO', { limit: uploadLimit })} />
        </div>
    );

    if (isMobile) {
        return (
            <div className="flex flex-col">
                <div className="sticky top-0 z-10 -mx-4 flex h-14 items-center gap-1 bg-n-surface-1 px-2">
                    <IconButton icon="i-lucide-chevron-left" label={t('STICKER_LIBRARY.BACK')} onClick={onBack} />
                    <button
                        type="button"
                        className="reset-base min-w-0 flex-1 truncate border-0 bg-transparent px-1 text-left text-base font-semibold text-n-slate-12"
                        title={pack.name}
                        onClick={() => setRenameSheetOpen(true)}
                    >
                        {pack.name}
                    </button>
                    <Menu label={t('STICKER_LIBRARY.PACK_MENU')} items={menuItems} />
                </div>
                <div className="flex h-12 items-center justify-between gap-2">
                    {statusBadge}
                    {publishSwitch}
                </div>
                {publishHint}
                {summary}
                <PackNameSheet
                    open={isRenameSheetOpen}
                    title={t('STICKER_LIBRARY.RENAME')}
                    submitLabel={t('STICKER_LIBRARY.SAVE')}
                    initialName={pack.name}
                    maxLength={maxNameLength}
                    packs={packs}
                    exceptPackId={pack.id}
                    busy={isRenaming}
                    onSubmit={name => void commitRename(name)}
                    onClose={() => setRenameSheetOpen(false)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex min-h-14 items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <InlineInput
                        ref={nameInputRef}
                        type="text"
                        value={nameDraft}
                        maxLength={maxNameLength}
                        title={pack.name}
                        aria-label={t('STICKER_LIBRARY.PACK_NAME_LABEL')}
                        disabled={isRenaming}
                        className="min-w-0 flex-1"
                        customInputClass="!h-9 !text-lg font-semibold rounded-md px-1 py-0 -mx-1 focus:bg-n-alpha-1 [@media(hover:hover)]:hover:bg-n-alpha-1"
                        onChange={event => setNameDraft(event.target.value)}
                        onEnterPress={() => nameInputRef.current?.blur()}
                        onEscapePress={() => {
                            discardOnBlur.current = true;
                            setNameDraft(pack.name);
                            nameInputRef.current?.blur();
                        }}
                        onBlur={() => {
                            if (discardOnBlur.current) {
                                discardOnBlur.current = false;
                                return;
                            }
                            void commitRename(nameDraft);
                        }}
                    />
                    {isRenaming ? <Loader size={16} className="text-n-slate-11" /> : null}
                    {showSaved ? (
                        <span role="status" className="inline-flex shrink-0 items-center gap-1 text-xs text-n-teal-11">
                            <span className="i-lucide-check size-3.5" aria-hidden="true" />
                            {t('STICKER_LIBRARY.SAVED')}
                        </span>
                    ) : null}
                    {isCounterVisible(nameDraft.length, maxNameLength) ? (
                        <span className="shrink-0 text-xs text-n-slate-11">
                            {nameDraft.length}/{maxNameLength}
                        </span>
                    ) : null}
                    {statusBadge}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {publishSwitch}
                    <StickerButton tone="primary" icon="i-lucide-plus" disabled={!canAddSticker} onClick={onAddSticker}>
                        {t('STICKER_LIBRARY.ADD_STICKER')}
                    </StickerButton>
                    <Menu label={t('STICKER_LIBRARY.PACK_MENU')} items={menuItems} />
                </div>
            </div>
            {publishHint}
            {summary}
        </div>
    );
}
