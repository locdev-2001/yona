import { useState } from 'react';

import StickerImage from 'shared/sticker/StickerImage';

import EmojiPicker, { EMOJI_CELL_CLASS, EMOJI_GRID_CLASS } from '../EmojiPicker';
import { readRecentReactions, rememberRecentReaction } from './composerStorage';
import type { RecentReaction } from './composerStorage';
import { t } from '../../i18n';
import type { WidgetSticker } from '../../types';

type StickerPanelTab = 'sticker' | 'emoji' | 'recent';

interface StickerPanelProps {
    stickers: WidgetSticker[];
    canPickEmoji?: boolean;
    onSelectEmoji: (emoji: string) => void;
    onSelectSticker: (sticker: WidgetSticker) => void;
}

const STICKER_GRID_CLASS = 'grid grid-cols-4 gap-[9px]';
const STICKER_CELL_CLASS =
    'flex items-center justify-center w-full aspect-square rounded-xl p-1 hover:bg-[var(--yona-chat-hover)] active:scale-[0.97]';

// Panel nằm TRÊN ô nhập: tab Sticker (chỉ khi kênh có danh mục sticker), Emoji
// (khi hộp thư bật bộ chọn biểu tượng cảm xúc) và Gần đây.
export default function StickerPanel({ stickers, canPickEmoji = true, onSelectEmoji, onSelectSticker }: StickerPanelProps) {
    const hasStickers = stickers.length > 0;
    const [activeTab, setActiveTab] = useState<StickerPanelTab>(hasStickers ? 'sticker' : 'emoji');
    const [recentReactions, setRecentReactions] = useState<RecentReaction[]>(readRecentReactions);

    const pickEmoji = (emoji: string) => {
        setRecentReactions(rememberRecentReaction({ kind: 'emoji', value: emoji }));
        onSelectEmoji(emoji);
    };

    const pickSticker = (sticker: WidgetSticker) => {
        setRecentReactions(rememberRecentReaction({ kind: 'sticker', id: sticker.id, imageUrl: sticker.image_url }));
        onSelectSticker(sticker);
    };

    const pickRecent = (reaction: RecentReaction) => {
        if (reaction.kind === 'emoji') {
            pickEmoji(reaction.value);
            return;
        }
        const sticker = stickers.find(item => item.id === reaction.id);
        if (sticker) pickSticker(sticker);
    };

    const stickerLabelOf = (stickerId: string): string =>
        stickers.find(sticker => sticker.id === stickerId)?.label || t('STICKER_PANEL.STICKER_ALT');

    const recentAvailable = recentReactions.filter(reaction =>
        reaction.kind === 'emoji' ? canPickEmoji : stickers.some(sticker => sticker.id === reaction.id),
    );
    const recentHasStickers = recentAvailable.some(reaction => reaction.kind === 'sticker');

    const tabs: { key: StickerPanelTab; label: string }[] = [
        ...(hasStickers ? [{ key: 'sticker' as const, label: t('STICKER_PANEL.TAB_STICKER') }] : []),
        ...(canPickEmoji ? [{ key: 'emoji' as const, label: t('STICKER_PANEL.TAB_EMOJI') }] : []),
        { key: 'recent', label: t('STICKER_PANEL.TAB_RECENT') },
    ];

    return (
        // Trải hết bề ngang footer; đứng đầu footer thì sát viền trên, còn nằm dưới khối
        // "đang trả lời" thì có viền ngăn cách.
        <div
            className="-mx-3.5 mb-3 border-y border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] [:first-child>&]:-mt-[11px] [:first-child>&]:border-t-0"
            data-testid="sticker-panel"
        >
            <div role="tablist" className="flex px-1.5 border-b border-[var(--yona-chat-line)]">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        className={`flex min-h-11 items-center border-b-2 px-3 text-xs leading-none active:scale-[0.97] ${
                            activeTab === tab.key
                                ? 'border-[var(--yona-chat-ink)] font-semibold text-[var(--yona-chat-ink)]'
                                : 'border-transparent font-medium text-[var(--yona-chat-ink-muted)]'
                        }`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="h-48 px-3.5 py-3">
                {activeTab === 'emoji' ? (
                    <EmojiPicker onSelect={pickEmoji} />
                ) : activeTab === 'sticker' ? (
                    <div className={`${STICKER_GRID_CLASS} h-full overflow-y-auto no-scrollbar`}>
                        {stickers.map(sticker => (
                            <button
                                key={sticker.id}
                                type="button"
                                className={STICKER_CELL_CLASS}
                                aria-label={sticker.label || t('STICKER_PANEL.STICKER_ALT')}
                                onClick={() => pickSticker(sticker)}
                            >
                                <StickerImage src={sticker.image_url} />
                            </button>
                        ))}
                    </div>
                ) : recentAvailable.length ? (
                    <div
                        className={`${recentHasStickers ? STICKER_GRID_CLASS : EMOJI_GRID_CLASS} h-full content-start overflow-y-auto no-scrollbar`}
                    >
                        {recentAvailable.map(reaction => (
                            <button
                                key={reaction.kind === 'emoji' ? `e-${reaction.value}` : `s-${reaction.id}`}
                                type="button"
                                className={reaction.kind === 'emoji' ? EMOJI_CELL_CLASS : STICKER_CELL_CLASS}
                                aria-label={reaction.kind === 'emoji' ? reaction.value : stickerLabelOf(reaction.id)}
                                onClick={() => pickRecent(reaction)}
                            >
                                {reaction.kind === 'emoji' ? (
                                    reaction.value
                                ) : (
                                    <StickerImage src={reaction.imageUrl} />
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="flex items-center justify-center h-full text-[13px] text-[var(--yona-chat-ink-muted)]">
                        {t('STICKER_PANEL.RECENT_EMPTY')}
                    </p>
                )}
            </div>
        </div>
    );
}
