import { useEffect, useId, useRef, useState } from 'react';

import { t } from '../../../i18n';
import { isCounterVisible } from './stickerLimits';
import { IconButton, INPUT_CLASS, Modal, StickerButton } from './stickerLibraryUi';
import type { LibraryStickerPack } from './types';

const normalizedName = (name: string) => name.trim().toLocaleLowerCase('vi');

export const isDuplicatePackName = (name: string, packs: LibraryStickerPack[], exceptPackId?: number) =>
    name.trim() !== '' && packs.some(pack => pack.id !== exceptPackId && normalizedName(pack.name) === normalizedName(name));

interface PackNameFieldProps {
    label: string;
    value: string;
    maxLength: number;
    packs: LibraryStickerPack[];
    exceptPackId?: number;
    autoFocus?: boolean;
    disabled?: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

// Ô nhập tên bộ: bộ đếm khi gần chạm giới hạn, cảnh báo trùng tên nhưng vẫn cho lưu.
export function PackNameField({ label, value, maxLength, packs, exceptPackId, autoFocus = true, disabled = false, onChange, onSubmit, onCancel }: PackNameFieldProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const isDuplicate = isDuplicatePackName(value, packs, exceptPackId);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    return (
        <div className="flex flex-col gap-1">
            <input
                ref={inputRef}
                id={inputId}
                type="text"
                className={INPUT_CLASS}
                value={value}
                maxLength={maxLength}
                disabled={disabled}
                placeholder={t('STICKER_LIBRARY.NEW_PACK_PLACEHOLDER')}
                aria-label={label}
                aria-describedby={isDuplicate ? `${inputId}-duplicate` : undefined}
                enterKeyHint="done"
                onChange={event => onChange(event.target.value)}
                onKeyDown={event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        onSubmit();
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        onCancel();
                    }
                }}
            />
            <div className="flex min-h-4 items-start justify-between gap-2 text-xs">
                {isDuplicate ? (
                    <span id={`${inputId}-duplicate`} className="text-n-amber-11">
                        {t('STICKER_LIBRARY.DUPLICATE_PACK_NAME')}
                    </span>
                ) : (
                    <span />
                )}
                {isCounterVisible(value.length, maxLength) ? (
                    <span className="text-n-slate-11">
                        {value.length}/{maxLength}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

// Bottom sheet nhập tên bộ trên điện thoại (tạo bộ mới hoặc đổi tên).
export function PackNameSheet({
    open,
    title,
    submitLabel,
    initialName,
    maxLength,
    packs,
    exceptPackId,
    busy,
    onSubmit,
    onClose,
}: {
    open: boolean;
    title: string;
    submitLabel: string;
    initialName: string;
    maxLength: number;
    packs: LibraryStickerPack[];
    exceptPackId?: number;
    busy: boolean;
    onSubmit: (name: string) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(initialName);

    useEffect(() => {
        if (open) setName(initialName);
    }, [open, initialName]);

    const submit = () => name.trim() && onSubmit(name.trim());

    return (
        <Modal
            open={open}
            title={title}
            variant="sheet"
            onRequestClose={onClose}
            footer={
                <StickerButton tone="primary" size="lg" className="w-full" busy={busy} disabled={!name.trim()} onClick={submit}>
                    {submitLabel}
                </StickerButton>
            }
        >
            <div className="px-5 pb-2 pt-2">
                <PackNameField label={title} value={name} maxLength={maxLength} packs={packs} exceptPackId={exceptPackId} onChange={setName} onSubmit={submit} onCancel={onClose} />
            </div>
        </Modal>
    );
}

function PackCover({ pack, size }: { pack: LibraryStickerPack; size: 'sm' | 'lg' }) {
    const box = size === 'sm' ? 'size-8' : 'size-10';

    return pack.cover_url ? (
        <span className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-md bg-n-solid-1`}>
            <img src={pack.cover_url} alt="" className="size-full object-contain" />
        </span>
    ) : (
        <span className={`flex ${box} shrink-0 items-center justify-center rounded-md bg-n-surface-field`}>
            <span className="i-lucide-sticker size-4 text-n-slate-9" aria-hidden="true" />
        </span>
    );
}

interface StickerPackListProps {
    packs: LibraryStickerPack[];
    selectedPackId: number | null;
    isMobile: boolean;
    isCreating: boolean;
    creatingDraftOpen: boolean;
    maxNameLength: number;
    onSelect: (packId: number) => void;
    onOpenCreate: () => void;
    onCloseCreate: () => void;
    onCreate: (name: string) => void;
}

export default function StickerPackList({
    packs,
    selectedPackId,
    isMobile,
    isCreating,
    creatingDraftOpen,
    maxNameLength,
    onSelect,
    onOpenCreate,
    onCloseCreate,
    onCreate,
}: StickerPackListProps) {
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (!creatingDraftOpen) setNewName('');
    }, [creatingDraftOpen]);

    const submit = () => newName.trim() && onCreate(newName.trim());
    const heading = t('STICKER_LIBRARY.PACKS_HEADING', { count: packs.length });

    return (
        <nav aria-label={heading} className="flex min-h-0 flex-col">
            <div className="flex h-11 shrink-0 items-center justify-between gap-2 md:h-10">
                <h2 className="m-0 text-sm font-semibold text-n-slate-12">{heading}</h2>
                {isMobile ? (
                    <StickerButton tone="secondary" icon="i-lucide-plus" onClick={onOpenCreate}>
                        {t('STICKER_LIBRARY.NEW_PACK')}
                    </StickerButton>
                ) : (
                    <IconButton icon="i-lucide-plus" label={t('STICKER_LIBRARY.NEW_PACK')} tone="secondary" onClick={onOpenCreate} />
                )}
            </div>
            {creatingDraftOpen && !isMobile ? (
                <div className="pb-2 pt-1">
                    <PackNameField
                        label={t('STICKER_LIBRARY.NEW_PACK_PLACEHOLDER')}
                        value={newName}
                        maxLength={maxNameLength}
                        packs={packs}
                        disabled={isCreating}
                        onChange={setNewName}
                        onSubmit={submit}
                        onCancel={onCloseCreate}
                    />
                </div>
            ) : null}
            <ul className="reset-base m-0 flex min-h-0 list-none flex-col gap-0.5 overflow-y-auto p-0">
                {packs.map(pack => {
                    const selected = pack.id === selectedPackId;
                    const count = t('STICKER_LIBRARY.STICKERS_COUNT', { count: pack.stickers_count ?? 0 });
                    const status = pack.published ? t('STICKER_LIBRARY.PUBLISHED') : t('STICKER_LIBRARY.DRAFT');

                    return (
                        <li key={pack.id} className="relative">
                            <button
                                type="button"
                                onClick={() => onSelect(pack.id)}
                                aria-current={selected ? 'true' : undefined}
                                title={pack.name}
                                className={`reset-base relative flex w-full items-center gap-3 rounded-lg border-0 px-2 text-left text-n-slate-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-brand ${
                                    isMobile ? 'h-16' : 'h-12'
                                } ${selected && !isMobile ? 'bg-n-alpha-2' : 'bg-transparent [@media(hover:hover)]:hover:bg-n-alpha-1'}`}
                            >
                                {selected && !isMobile ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-n-brand" aria-hidden="true" /> : null}
                                <PackCover pack={pack} size={isMobile ? 'lg' : 'sm'} />
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-medium">{pack.name}</span>
                                    <span className="truncate text-xs text-n-slate-11">{isMobile ? `${count} · ${status}` : count}</span>
                                </span>
                                {isMobile ? (
                                    <span className="i-lucide-chevron-right size-4 shrink-0 text-n-slate-9" aria-hidden="true" />
                                ) : (
                                    <span
                                        className={`size-2 shrink-0 rounded-full ${pack.published ? 'bg-n-teal-9' : 'border border-solid border-n-slate-8'}`}
                                        aria-hidden="true"
                                    />
                                )}
                                {isMobile ? null : <span className="sr-only">{status}</span>}
                            </button>
                        </li>
                    );
                })}
            </ul>
            {isMobile ? (
                <PackNameSheet
                    open={creatingDraftOpen}
                    title={t('STICKER_LIBRARY.NEW_PACK')}
                    submitLabel={t('STICKER_LIBRARY.CREATE')}
                    initialName=""
                    maxLength={maxNameLength}
                    packs={packs}
                    busy={isCreating}
                    onSubmit={onCreate}
                    onClose={onCloseCreate}
                />
            ) : null}
        </nav>
    );
}
