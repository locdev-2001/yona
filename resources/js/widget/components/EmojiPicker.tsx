import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

import {
    addRecentEmoji,
    buildEmojiSections,
    getEmojiTint,
    getRecentEmojis,
} from 'shared/components/emoji/pickerHelper';
import type { PickerEmoji } from 'shared/components/emoji/pickerHelper';

import { t } from '../i18n';

// Port từ shared/components/emoji/EmojiPicker.vue — bảng emoji của widget.
// Khác bản gốc: danh sách render thẳng trong khung cuộn thay cho Virtualizer
// (thư viện ảo hóa của Vue), cùng lối đã dùng cho EmojiIconPicker của dashboard.
export default function EmojiPicker({
    className = '',
    onSelect,
}: {
    className?: string;
    onSelect: (emoji: string) => void;
}) {
    const [emojiSearch, setEmojiSearch] = useState('');
    const [recentEmojis, setRecentEmojis] = useState<PickerEmoji[]>([]);
    const searchInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setRecentEmojis(getRecentEmojis());
        searchInput.current?.focus();
    }, []);

    const emojiSections = useMemo(
        () => buildEmojiSections(emojiSearch, recentEmojis, t('EMOJI_ICON_PICKER.FREQUENTLY_USED')),
        [emojiSearch, recentEmojis],
    );

    const applyEmojiTint = (event: MouseEvent<HTMLButtonElement>, emoji: string) => {
        event.currentTarget.style.setProperty('--ep-tint', getEmojiTint(emoji));
    };

    const selectEmoji = (emoji: PickerEmoji) => {
        setRecentEmojis(addRecentEmoji(emoji));
        onSelect(emoji.emoji);
    };

    return (
        <div
            role="dialog"
            className={`absolute z-20 flex flex-col overflow-hidden shadow-xl w-[22rem] bg-n-surface-2 backdrop-blur-[100px] rounded-2xl outline outline-1 outline-n-weak dark:outline-n-strong/50 ${className}`.trim()}
        >
            <div className="flex flex-col gap-1.5 pt-2">
                <div className="relative px-2">
                    <span className="absolute z-10 -translate-y-1/2 i-lucide-search size-4 text-n-slate-10 top-1/2 start-5" />
                    <input
                        ref={searchInput}
                        type="text"
                        value={emojiSearch}
                        onChange={event => setEmojiSearch(event.target.value)}
                        className="block w-full h-10 text-sm reset-base outline outline-1 outline-offset-[-1px] outline-n-weak focus:outline-n-brand border-none rounded-lg !ps-9 !pe-3 !py-2.5 bg-transparent text-n-slate-12 placeholder:text-n-slate-10"
                        placeholder={t('EMOJI_ICON_PICKER.SEARCH_EMOJI')}
                    />
                </div>
                {emojiSections.length ? (
                    <div className="h-60 overflow-y-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {emojiSections.map(section => (
                            <div key={section.name}>
                                <h5 className="px-1 pt-2 pb-1 m-0 text-xs font-medium tracking-wide uppercase text-n-slate-10">
                                    {section.name}
                                </h5>
                                <div className="grid grid-cols-10 gap-0.5">
                                    {section.emojis.map(emoji => (
                                        <button
                                            key={`${section.name}-${emoji.slug}`}
                                            type="button"
                                            title={emoji.name}
                                            className="flex items-center justify-center !p-0 w-full max-w-[2rem] text-xl transition-colors rounded-lg aspect-square hover:bg-[var(--ep-tint)] active:enabled:scale-[0.97]"
                                            onMouseEnter={event => applyEmojiTint(event, emoji.emoji)}
                                            onClick={() => selectEmoji(emoji)}
                                        >
                                            {emoji.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 h-60 text-n-slate-10">
                        <span className="i-lucide-smile-plus size-7" />
                        <span className="text-sm font-medium">{t('EMOJI_ICON_PICKER.NO_EMOJI')}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
