import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import { buildEmojiSections, getEmojiTint } from 'shared/components/emoji/pickerHelper';

import { t } from '../i18n';

// Lưới ô ≥ 44px, số cột tự theo bề rộng khung chat.
export const EMOJI_GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))]';
export const EMOJI_CELL_CLASS =
    'flex aspect-square items-center justify-center rounded-xl text-[22px] leading-none transition-colors hover:bg-[var(--ep-tint)] active:scale-[0.97]';

// Tab Emoji của panel trên ô nhập: ô tìm gọn và một lưới liền (không tiêu đề nhóm;
// emoji dùng gần đây nằm ở tab "Gần đây" của panel, không lặp ở đây).
export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
    const [emojiSearch, setEmojiSearch] = useState('');

    const emojis = useMemo(
        () => buildEmojiSections(emojiSearch, [], '').flatMap(section => section.emojis),
        [emojiSearch],
    );

    const applyEmojiTint = (event: MouseEvent<HTMLButtonElement>, emoji: string) => {
        event.currentTarget.style.setProperty('--ep-tint', getEmojiTint(emoji));
    };

    return (
        <div className="flex flex-col h-full min-h-0 gap-2">
            <div className="relative flex-none">
                <span className="absolute -translate-y-1/2 pointer-events-none i-lucide-search size-4 top-1/2 start-3 text-[var(--yona-chat-ink-muted)]" />
                <input
                    type="search"
                    value={emojiSearch}
                    aria-label={t('EMOJI_ICON_PICKER.SEARCH_EMOJI')}
                    placeholder={t('EMOJI_ICON_PICKER.SEARCH_EMOJI')}
                    className="reset-base block w-full h-9 rounded-[11px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-field)] ps-9 pe-3 text-[13px] leading-[18px] text-[var(--yona-chat-ink)] outline-none placeholder:text-[var(--yona-chat-ink-muted)] focus:border-[var(--yona-chat-accent)]"
                    onChange={event => setEmojiSearch(event.target.value)}
                />
            </div>
            {emojis.length ? (
                <div className={`${EMOJI_GRID_CLASS} flex-1 min-h-0 overflow-y-auto no-scrollbar`}>
                    {emojis.map(emoji => (
                        <button
                            key={emoji.slug}
                            type="button"
                            title={emoji.name}
                            aria-label={emoji.name}
                            className={EMOJI_CELL_CLASS}
                            onMouseEnter={event => applyEmojiTint(event, emoji.emoji)}
                            onClick={() => onSelect(emoji.emoji)}
                        >
                            {emoji.emoji}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 text-[var(--yona-chat-ink-muted)]">
                    <span className="i-lucide-smile-plus size-7" />
                    <span className="text-[13px] font-medium">{t('EMOJI_ICON_PICKER.NO_EMOJI')}</span>
                </div>
            )}
        </div>
    );
}
