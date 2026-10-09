import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MouseEvent, RefObject } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import ColorPalette from './ColorPalette';
import { CURATED_ICONS } from './icons';
import type { CuratedIcon } from './icons';
import {
    DEFAULT_ICON_COLOR,
    PICKER_MODE,
    PICKER_TAB,
    isIconValue,
} from './constants';
import type { PickerTab } from './constants';
import {
    addRecentEmoji,
    buildEmojiSections,
    getEmojiTint,
    getRecentEmojis,
} from 'shared/components/emoji/pickerHelper';
import type { PickerEmoji } from 'shared/components/emoji/pickerHelper';

// Port từ dashboard/components-next/emoji-icon-picker/EmojiIconPicker.vue.
// Khác bản gốc:
// 1. Danh sách emoji render thẳng trong khung cuộn thay cho virtua/Virtualizer
//    (thư viện ảo hóa của Vue) — DOM trong popup khác, class + hành vi giữ nguyên.
// 2. Popup dựng qua portal ở <body> với position: fixed thay vì absolute trong
//    luồng. Bản gốc đặt absolute nên bị khung cha `overflow-y-auto` xén mất phần
//    dưới; portal thoát khỏi mọi khung cuộn và tự lật lên trên khi thiếu chỗ.
export interface PickerSelection {
    type: 'icon' | 'emoji';
    value: string;
    color?: string;
}

// Chừa mép màn hình khi popup phải lật lên hoặc dịch ngang.
const VIEWPORT_MARGIN = 8;

interface EmojiIconPickerProps {
    mode?: (typeof PICKER_MODE)[keyof typeof PICKER_MODE];
    value?: string;
    color?: string;
    showRemoveButton?: boolean;
    // Phần tử neo popup (nút mở). Popup bám mép dưới - mép trái của nó.
    anchorRef: RefObject<HTMLElement | null>;
    onSelect: (selection: PickerSelection) => void;
    onColorChange?: (color: string) => void;
    onRemove?: () => void;
    onClose: () => void;
}

export default function EmojiIconPicker({
    mode = PICKER_MODE.BOTH,
    value = '',
    color = '',
    showRemoveButton = false,
    anchorRef,
    onSelect,
    onColorChange,
    onRemove,
    onClose,
}: EmojiIconPickerProps) {
    const showTabs = mode === PICKER_MODE.BOTH;
    const showHeader = showTabs || (showRemoveButton && Boolean(value));

    const [activeTab, setActiveTab] = useState<PickerTab>(
        value && !isIconValue(value) ? PICKER_TAB.EMOJIS : PICKER_TAB.ICONS,
    );
    const [iconSearch, setIconSearch] = useState('');
    const [selectedColor, setSelectedColor] = useState(color || DEFAULT_ICON_COLOR);
    const [emojiSearch, setEmojiSearch] = useState('');
    const [recentEmojis, setRecentEmojis] = useState<PickerEmoji[]>([]);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setRecentEmojis(getRecentEmojis());
    }, []);

    // Đo trước khi trình duyệt vẽ để popup không nhấp nháy ở vị trí sai.
    useLayoutEffect(() => {
        const place = () => {
            const anchor = anchorRef.current;
            const panel = panelRef.current;
            if (!anchor || !panel) return;

            const bounds = anchor.getBoundingClientRect();
            const { offsetWidth: panelWidth, offsetHeight: panelHeight } = panel;

            const fitsBelow = bounds.bottom + panelHeight <= window.innerHeight - VIEWPORT_MARGIN;
            const top = fitsBelow
                ? bounds.bottom
                : Math.max(VIEWPORT_MARGIN, bounds.top - panelHeight);
            const left = Math.max(
                VIEWPORT_MARGIN,
                Math.min(bounds.left, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
            );

            setPosition({ top, left });
        };

        place();
        window.addEventListener('resize', place);
        // capture: bắt cả khung cuộn bên trong, không chỉ cuộn trang.
        window.addEventListener('scroll', place, true);

        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
        // Đổi tab làm popup cao khác nhau nên phải đặt lại chỗ.
    }, [anchorRef, activeTab]);

    // Popup nằm ngoài cây DOM của nút mở nên tự lo việc đóng khi bấm ra ngoài;
    // bỏ qua chính nút neo để không đóng rồi mở lại ngay.
    useEffect(() => {
        const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
            const target = event.target as Node;
            if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
            onClose();
        };

        document.addEventListener('mousedown', closeOnOutsideClick);

        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [anchorRef, onClose]);

    const tabs = [
        { id: PICKER_TAB.ICONS, label: t('EMOJI_ICON_PICKER.TABS.ICONS'), icon: 'i-lucide-shapes' },
        { id: PICKER_TAB.EMOJIS, label: t('EMOJI_ICON_PICKER.TABS.EMOJIS'), icon: 'i-lucide-smile' },
    ];

    const filteredIcons = useMemo(() => {
        const term = iconSearch.trim().toLowerCase();
        if (!term) return CURATED_ICONS;
        return CURATED_ICONS.filter(icon => icon.name.includes(term) || icon.keywords.includes(term));
    }, [iconSearch]);

    const emojiSections = useMemo(
        () => buildEmojiSections(emojiSearch, recentEmojis, t('EMOJI_ICON_PICKER.FREQUENTLY_USED')),
        [emojiSearch, recentEmojis],
    );

    const changeColor = (nextColor: string) => {
        setSelectedColor(nextColor);
        if (isIconValue(value)) onColorChange?.(nextColor);
    };

    const selectIcon = (icon: CuratedIcon) => {
        onSelect({ type: 'icon', value: icon.name, color: selectedColor });
    };

    const selectEmoji = (emoji: PickerEmoji) => {
        setRecentEmojis(addRecentEmoji(emoji));
        onSelect({ type: 'emoji', value: emoji.emoji });
    };

    const applyEmojiTint = (event: MouseEvent<HTMLButtonElement>, emoji: string) => {
        event.currentTarget.style.setProperty('--ep-tint', getEmojiTint(emoji));
    };

    return createPortal(
        <div
            ref={panelRef}
            role="dialog"
            style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                // Ẩn bằng opacity chứ không phải visibility: lần vẽ đầu chỉ dùng để
                // đo kích thước, mà phần tử visibility:hidden thì KHÔNG nhận được
                // focus — `autoFocus` của ô tìm kiếm sẽ rơi mất. opacity giữ nguyên
                // khả năng focus và cũng không kịp lên màn (useLayoutEffect đặt chỗ
                // xong trước khi trình duyệt vẽ).
                opacity: position ? 1 : 0,
            }}
            className="fixed z-20 flex flex-col overflow-hidden w-[22rem] overlay-surface rounded-2xl"
        >
            {showHeader ? (
                <div className="flex items-center justify-between gap-2 p-2">
                    {showTabs ? (
                        <div className="flex gap-0.5 p-0.5 rounded-lg bg-n-alpha-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    title={tab.label}
                                    className={`flex items-center justify-center !p-0 transition-all rounded-md size-7 active:scale-[0.92] ${
                                        activeTab === tab.id
                                            ? 'bg-n-surface-selected text-n-slate-12'
                                            : 'text-n-slate-10 hover:text-n-slate-12'
                                    }`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span className={`${tab.icon} size-4`} />
                                </button>
                            ))}
                        </div>
                    ) : null}
                    {showRemoveButton && value ? (
                        <Button
                            type="button"
                            variant="ghost"
                            color="slate"
                            size="sm"
                            icon="i-lucide-eraser"
                            title={t('EMOJI_ICON_PICKER.REMOVE')}
                            className="flex-shrink-0"
                            onClick={() => onRemove?.()}
                        />
                    ) : null}
                </div>
            ) : null}

            {showTabs && activeTab === PICKER_TAB.ICONS ? (
                <div
                    className="flex flex-col gap-1.5"
                    style={{ ['--ep-tint' as string]: `${selectedColor}24` }}
                >
                    <ColorPalette value={selectedColor} onChange={changeColor} />
                    <div className="flex items-center gap-1 px-2">
                        <Input
                            value={iconSearch}
                            size="md"
                            className="flex-1"
                            placeholder={t('EMOJI_ICON_PICKER.SEARCH_ICON')}
                            customInputClass="!ps-9 !bg-transparent"
                            autoFocus
                            onChange={event => setIconSearch(event.target.value)}
                            prefix={
                                <span className="absolute z-10 -translate-y-1/2 i-lucide-search size-4 text-n-slate-10 top-1/2 start-3" />
                            }
                        />
                    </div>
                    {filteredIcons.length ? (
                        <div className="grid grid-cols-10 h-52 gap-0.5 overflow-y-auto no-scrollbar content-start px-2 pb-2">
                            {filteredIcons.map(icon => (
                                <button
                                    key={icon.name}
                                    type="button"
                                    title={icon.name}
                                    className="flex items-center justify-center !p-0 size-8 transition-colors rounded-lg aspect-square hover:bg-[var(--ep-tint)] active:enabled:scale-[0.97]"
                                    onClick={() => selectIcon(icon)}
                                >
                                    <span
                                        className={`${icon.icon} size-[1.125rem]`}
                                        style={{ color: selectedColor }}
                                    />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 h-52 text-n-slate-10">
                            <span className="i-lucide-search-x size-7" />
                            <span className="text-sm font-medium">{t('EMOJI_ICON_PICKER.NO_ICON')}</span>
                        </div>
                    )}
                </div>
            ) : null}

            {!showTabs || activeTab === PICKER_TAB.EMOJIS ? (
                <div className={`flex flex-col gap-1.5 ${showHeader ? '' : 'pt-2'}`}>
                    <div className="px-2">
                        <Input
                            value={emojiSearch}
                            size="md"
                            placeholder={t('EMOJI_ICON_PICKER.SEARCH_EMOJI')}
                            customInputClass="!ps-9 !bg-transparent"
                            autoFocus
                            onChange={event => setEmojiSearch(event.target.value)}
                            prefix={
                                <span className="absolute z-10 -translate-y-1/2 i-lucide-search size-4 text-n-slate-10 top-1/2 start-3" />
                            }
                        />
                    </div>
                    {emojiSections.length ? (
                        <div className="h-60 overflow-y-auto px-2 no-scrollbar pb-2">
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
                                                className="flex items-center justify-center !p-0 size-8 w-full max-w-[2rem] text-xl transition-colors rounded-lg aspect-square hover:bg-[var(--ep-tint)] active:enabled:scale-[0.97]"
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
            ) : null}
        </div>,
        document.body,
    );
}
