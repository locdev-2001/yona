import { useState } from 'react';

import EmojiPicker from '../EmojiPicker';
import { readRecentReactions, rememberRecentReaction } from './composerStorage';
import type { RecentReaction } from './composerStorage';
import { t } from '../../i18n';
import type { WidgetSticker } from '../../types';

type StickerPanelTab = 'sticker' | 'emoji' | 'recent';

interface StickerPanelProps {
    stickers: WidgetSticker[];
    onSelectEmoji: (emoji: string) => void;
    onSelectSticker: (sticker: WidgetSticker) => void;
}

const GRID_CELL_CLASS =
    'flex items-center justify-center w-full aspect-square rounded-xl hover:bg-[var(--yona-chat-field)] active:scale-[0.97]';

// Panel Sticker / Emoji / Gần đây. Tab Sticker chỉ hiện khi kênh có danh mục sticker.
export default function StickerPanel({ stickers, onSelectEmoji, onSelectSticker }: StickerPanelProps) {
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

    const recentAvailable = recentReactions.filter(
        reaction => reaction.kind === 'emoji' || stickers.some(sticker => sticker.id === reaction.id),
    );

    const tabs: { key: StickerPanelTab; label: string }[] = [
        ...(hasStickers ? [{ key: 'sticker' as const, label: t('STICKER_PANEL.TAB_STICKER') }] : []),
        { key: 'emoji', label: t('STICKER_PANEL.TAB_EMOJI') },
        { key: 'recent', label: t('STICKER_PANEL.TAB_RECENT') },
    ];

    return (
        <div className="border-t border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)]" data-testid="sticker-panel">
            <div role="tablist" className="flex gap-1 px-3 pt-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        className={`min-h-9 px-3 text-sm rounded-full ${
                            activeTab === tab.key
                                ? 'bg-[var(--yona-chat-field)] font-medium text-[var(--yona-chat-ink)]'
                                : 'text-[var(--yona-chat-ink-soft)]'
                        }`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeTab === 'emoji' ? (
                <EmojiPicker className="!static !w-full !shadow-none !outline-0 !rounded-none" onSelect={pickEmoji} />
            ) : (
                <div className="h-60 overflow-y-auto p-3">
                    {activeTab === 'sticker' ? (
                        <div className="grid grid-cols-4 gap-2">
                            {stickers.map(sticker => (
                                <button
                                    key={sticker.id}
                                    type="button"
                                    className={GRID_CELL_CLASS}
                                    aria-label={sticker.label || t('STICKER_PANEL.STICKER_ALT')}
                                    onClick={() => pickSticker(sticker)}
                                >
                                    <img src={sticker.image_url} alt="" className="object-contain w-full h-full p-1" />
                                </button>
                            ))}
                        </div>
                    ) : recentAvailable.length ? (
                        <div className="grid grid-cols-4 gap-2">
                            {recentAvailable.map(reaction => (
                                <button
                                    key={reaction.kind === 'emoji' ? `e-${reaction.value}` : `s-${reaction.id}`}
                                    type="button"
                                    className={`${GRID_CELL_CLASS} text-3xl`}
                                    aria-label={reaction.kind === 'emoji' ? reaction.value : stickerLabelOf(reaction.id)}
                                    onClick={() => pickRecent(reaction)}
                                >
                                    {reaction.kind === 'emoji' ? (
                                        reaction.value
                                    ) : (
                                        <img src={reaction.imageUrl} alt="" className="object-contain w-full h-full p-1" />
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="py-10 text-sm text-center text-[var(--yona-chat-ink-muted)]">
                            {t('STICKER_PANEL.RECENT_EMPTY')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
