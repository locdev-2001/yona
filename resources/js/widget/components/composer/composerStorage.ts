// Lưu tạm của ô nhập. Bộ nhớ trình duyệt có thể bị chặn (chế độ riêng tư, iframe
// bên thứ ba) nên mọi lần đọc/ghi đều bọc try/catch và rơi về giá trị rỗng.
const DRAFT_STORAGE_KEY = 'yona-widget-composer-draft';
const RECENT_STORAGE_KEY = 'yona-widget-recent-reactions';
const RECENT_LIMIT = 12;

export type RecentReaction = { kind: 'emoji'; value: string } | { kind: 'sticker'; id: string; imageUrl: string };

export function readComposerDraft(): string {
    try {
        return window.sessionStorage.getItem(DRAFT_STORAGE_KEY) ?? '';
    } catch {
        return '';
    }
}

export function writeComposerDraft(text: string): void {
    try {
        if (text) window.sessionStorage.setItem(DRAFT_STORAGE_KEY, text);
        else window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
        // Không lưu được thì bản nháp chỉ sống trong phiên hiện tại.
    }
}

const sameReaction = (left: RecentReaction, right: RecentReaction): boolean =>
    left.kind === 'emoji' && right.kind === 'emoji'
        ? left.value === right.value
        : left.kind === 'sticker' && right.kind === 'sticker' && left.id === right.id;

export function readRecentReactions(): RecentReaction[] {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? (parsed as RecentReaction[]) : [];
    } catch {
        return [];
    }
}

export function rememberRecentReaction(reaction: RecentReaction): RecentReaction[] {
    const nextRecent = [reaction, ...readRecentReactions().filter(item => !sameReaction(item, reaction))].slice(
        0,
        RECENT_LIMIT,
    );
    try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextRecent));
    } catch {
        // Bộ nhớ bị chặn: danh sách Gần đây chỉ còn trong lần mở này.
    }
    return nextRecent;
}
