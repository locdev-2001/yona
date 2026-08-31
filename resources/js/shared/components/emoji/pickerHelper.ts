import emojiGroups from './emojisGroup.json';

// Port từ shared/components/emoji/pickerHelper.js
export interface PickerEmoji {
    emoji: string;
    name: string;
    slug: string;
}

export interface EmojiSection {
    name: string;
    emojis: PickerEmoji[];
}

const RECENT_EMOJI_KEY = 'emoji-icon-picker.recent-emojis';
const MAX_RECENT_EMOJIS = 16;

const groups = emojiGroups as EmojiSection[];

const matchesSearch = (emoji: PickerEmoji, term: string): boolean =>
    emoji.slug.replaceAll('_', ' ').includes(term) || emoji.name.toLowerCase().includes(term);

export const buildEmojiSections = (
    search: string,
    recentEmojis: PickerEmoji[],
    frequentLabel: string,
): EmojiSection[] => {
    const term = search.trim().toLowerCase();
    if (term) {
        return groups
            .map(({ name, emojis }) => ({ name, emojis: emojis.filter(emoji => matchesSearch(emoji, term)) }))
            .filter(group => group.emojis.length > 0);
    }

    return [
        ...(recentEmojis.length ? [{ name: frequentLabel, emojis: recentEmojis }] : []),
        ...groups,
    ];
};

// Lấy màu trung bình của emoji (qua canvas) làm nền hover mờ. Cache theo emoji.
const emojiTintCache = new Map<string, string>();
const NEUTRAL_TINT = 'rgb(var(--slate-9) / 0.12)';

const sampleEmojiTint = (emoji: string): string => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return NEUTRAL_TINT;

    context.font = '14px serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(emoji, 8, 9);

    const { data } = context.getImageData(0, 0, 16, 16);
    const pixels = Array.from({ length: data.length / 4 }, (_, index) => index * 4).filter(
        index => data[index + 3] > 16,
    );
    if (!pixels.length) return NEUTRAL_TINT;

    const average = (offset: number) =>
        Math.round(pixels.reduce((sum, index) => sum + data[index + offset], 0) / pixels.length);

    return `rgba(${average(0)}, ${average(1)}, ${average(2)}, 0.16)`;
};

export const getEmojiTint = (emoji: string): string => {
    if (!emojiTintCache.has(emoji)) {
        let tint = NEUTRAL_TINT;
        try {
            tint = sampleEmojiTint(emoji);
        } catch {
            /* canvas không dùng được */
        }
        emojiTintCache.set(emoji, tint);
    }

    return emojiTintCache.get(emoji) ?? NEUTRAL_TINT;
};

export const getRecentEmojis = (): PickerEmoji[] => {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY) ?? '[]');
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
};

export const addRecentEmoji = (emoji: PickerEmoji): PickerEmoji[] => {
    const updated = [emoji, ...getRecentEmojis().filter(item => item.slug !== emoji.slug)].slice(
        0,
        MAX_RECENT_EMOJIS,
    );

    try {
        localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(updated));
    } catch {
        /* chế độ ẩn danh — recents là best-effort */
    }

    return updated;
};
