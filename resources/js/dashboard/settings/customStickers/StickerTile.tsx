import { useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { t } from '../../../i18n';
import StickerImage from 'shared/sticker/StickerImage';
import { Menu } from './stickerLibraryUi';
import Loader from 'shared/components/loader/Loader';
import type { MenuItem } from './stickerLibraryUi';
import type { LibrarySticker } from './types';

export const stickerTitle = (sticker: LibrarySticker, index: number) =>
    sticker.label
        ? t('STICKER_LIBRARY.STICKER_OPTION', { label: sticker.label, count: sticker.keywords.length })
        : t('STICKER_LIBRARY.STICKER_UNNAMED', { index: index + 1 });

export const isAnimatedSticker = (sticker: LibrarySticker) => (sticker.frames ?? 1) > 1;

// Ảnh thu về khung ô dù cỡ hiển thị cấu hình lớn hơn.
export function StickerThumb({ sticker, animate, className = 'size-[72%]' }: { sticker: LibrarySticker; animate: boolean; className?: string }) {
    const source = animate || !isAnimatedSticker(sticker) ? (sticker.image_url ?? sticker.static_url) : (sticker.static_url ?? sticker.image_url);
    if (!source) return null;

    return (
        <span className={`flex items-center justify-center ${className}`}>
            <StickerImage src={source} alt="" className="!h-full !w-full" />
        </span>
    );
}

interface StickerTileProps {
    sticker: LibrarySticker;
    index: number;
    isSelected: boolean;
    isFocusTarget: boolean;
    isDragging: boolean;
    isLifted: boolean;
    isDeleting: boolean;
    isFlashing: boolean;
    pollExhausted: boolean;
    sortMode: boolean;
    menuItems: MenuItem[];
    dragProps: Record<string, unknown> & { onPointerDown: (event: PointerEvent<HTMLElement>) => void };
    onActivate: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    onFocus: () => void;
}

export default function StickerTile({
    sticker,
    index,
    isSelected,
    isFocusTarget,
    isDragging,
    isLifted,
    isDeleting,
    isFlashing,
    pollExhausted,
    sortMode,
    menuItems,
    dragProps,
    onActivate,
    onKeyDown,
    onFocus,
}: StickerTileProps) {
    const [isHovered, setHovered] = useState(false);
    const isProcessing = sticker.status === 'processing';
    const isFailed = sticker.status === 'failed';
    const isStuck = isProcessing && pollExhausted;
    const lacksKeywords = sticker.status === 'ready' && sticker.keywords.length === 0;

    const tone = isFailed
        ? 'border-n-ruby-8 bg-n-ruby-3'
        : isProcessing && !isStuck
          ? 'animate-pulse border-n-weak bg-n-alpha-2'
          : 'border-n-weak bg-n-solid-1 [@media(hover:hover)]:hover:border-n-brand/50';

    return (
        <div
            className={`group relative aspect-square ${isDragging ? 'opacity-40' : ''} ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            {...dragProps}
        >
            <div
                role="option"
                data-sticker-id={sticker.id}
                aria-selected={isSelected}
                aria-busy={isProcessing || isDeleting || undefined}
                aria-label={stickerTitle(sticker, index)}
                title={stickerTitle(sticker, index)}
                tabIndex={isFocusTarget ? 0 : -1}
                onClick={onActivate}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                className={`flex size-full cursor-pointer select-none items-center justify-center overflow-hidden rounded-xl border border-solid outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-n-brand ${tone} ${
                    isSelected ? 'ring-2 ring-n-brand ring-offset-2' : ''
                } ${isLifted ? 'shadow-lg ring-2 ring-n-brand' : ''} ${isFlashing ? 'ring-2 ring-n-brand/60' : ''} ${sortMode ? 'touch-none' : ''}`}
            >
                {isFailed ? (
                    <span className="i-lucide-triangle-alert size-6 text-n-ruby-11" aria-hidden="true" />
                ) : isStuck ? (
                    <span className="flex flex-col items-center gap-1 px-1 text-center text-[11px] leading-tight text-n-slate-11">
                        <span className="i-lucide-refresh-cw size-4" aria-hidden="true" />
                        {t('STICKER_LIBRARY.POLL_EXHAUSTED')}
                    </span>
                ) : isProcessing ? (
                    <Loader size={20} className="text-n-slate-11" />
                ) : (
                    <StickerThumb sticker={sticker} animate={isHovered || isSelected} />
                )}
            </div>
            {lacksKeywords ? (
                <span
                    className="pointer-events-none absolute left-1.5 top-1.5 size-1.5 rounded-full bg-n-amber-9"
                    title={t('STICKER_LIBRARY.NO_KEYWORDS_DOT')}
                    aria-hidden="true"
                />
            ) : null}
            {isAnimatedSticker(sticker) && !isProcessing ? (
                <span
                    className="pointer-events-none absolute bottom-1 right-1 inline-flex h-4 items-center rounded bg-[rgb(0_0_0/0.7)] px-1 text-[10px] font-semibold leading-none text-white"
                    aria-hidden="true"
                >
                    {t('STICKER_LIBRARY.ANIMATED_BADGE')}
                </span>
            ) : null}
            {sortMode ? (
                <span className="pointer-events-none absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded bg-n-solid-1/90 text-n-slate-11" aria-hidden="true">
                    <span className="i-lucide-grip-vertical size-3.5" />
                </span>
            ) : (
                <div
                    data-no-drag=""
                    className="absolute right-0.5 top-0.5 hidden opacity-0 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:opacity-100"
                >
                    <Menu label={t('STICKER_LIBRARY.STICKER_MENU')} items={menuItems} compact tone="secondary" triggerClassName="!size-6 bg-n-solid-1/95" />
                </div>
            )}
        </div>
    );
}
