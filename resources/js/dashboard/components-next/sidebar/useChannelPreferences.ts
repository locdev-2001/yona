import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { usePage } from '@inertiajs/react';

import { putJson } from 'dashboard/helper/apiClient';
import type { SharedPageProps } from '../../../types';
import type { SidebarInbox } from './menuItems';

// Cách mỗi người bày danh sách kênh (nhóm Kênh trên sidebar, hàng chip kênh trên điện thoại):
// thứ tự, tên hiển thị riêng, kênh ẩn. Tên kênh thật và việc nhận tin không đổi.
export const CHANNEL_PREFERENCES_KEY = 'sidebar_channels';

export interface ChannelPreferences {
    order: number[];
    hidden: number[];
    aliases: Record<string, string>;
}

export interface ArrangedChannel {
    inbox: SidebarInbox;
    label: string;
    isHidden: boolean;
}

const EMPTY_PREFERENCES: ChannelPreferences = { order: [], hidden: [], aliases: {} };

function readPreferences(uiSettings: Record<string, unknown> | undefined): ChannelPreferences {
    const saved = uiSettings?.[CHANNEL_PREFERENCES_KEY] as Partial<ChannelPreferences> | undefined;

    return {
        order: Array.isArray(saved?.order) ? saved.order : [],
        hidden: Array.isArray(saved?.hidden) ? saved.hidden : [],
        aliases: saved?.aliases && typeof saved.aliases === 'object' ? saved.aliases : {},
    };
}

// Kênh chưa từng được sắp (kênh mới kết nối) giữ thứ tự server, nằm cuối.
export function arrangeChannels(inboxes: SidebarInbox[], preferences: ChannelPreferences): ArrangedChannel[] {
    const position = new Map(preferences.order.map((inboxId, index) => [inboxId, index]));
    const hidden = new Set(preferences.hidden);

    return [...inboxes]
        .sort((first, second) => (position.get(first.id) ?? Infinity) - (position.get(second.id) ?? Infinity))
        .map(inbox => ({
            inbox,
            label: preferences.aliases[String(inbox.id)]?.trim() || inbox.name,
            isHidden: hidden.has(inbox.id),
        }));
}

// Một bản dùng chung cho mọi nơi liệt kê kênh trong trang: sửa ở sidebar thì hàng chip đổi theo ngay.
let sharedPreferences: ChannelPreferences = EMPTY_PREFERENCES;
let sharedOwnerId: number | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Server gộp ui_settings theo khoá cấp một, nên luôn gửi trọn khoá này.
function savePreferences(next: ChannelPreferences) {
    sharedPreferences = next;
    listeners.forEach(listener => listener());
    void putJson('/api/v1/profile', { ui_settings: { [CHANNEL_PREFERENCES_KEY]: next } });
}

function useSharedPreferences(): ChannelPreferences {
    const { auth } = usePage<SharedPageProps>().props;
    const ownerId = auth.user?.id ?? null;
    if (sharedOwnerId !== ownerId) {
        sharedOwnerId = ownerId;
        sharedPreferences = auth.user ? readPreferences(auth.user.ui_settings) : EMPTY_PREFERENCES;
    }
    return useSyncExternalStore(subscribe, () => sharedPreferences);
}

// Tên hiển thị của một kênh (biệt danh nếu người dùng đã đặt) cho chỗ chỉ hiện một kênh.
export function useChannelDisplayName(inboxId: number | undefined, name: string): string {
    const preferences = useSharedPreferences();
    return (inboxId !== undefined && preferences.aliases[String(inboxId)]?.trim()) || name;
}

export function useChannelPreferences(inboxes: SidebarInbox[]) {
    const preferences = useSharedPreferences();

    const channels = useMemo(() => arrangeChannels(inboxes, preferences), [inboxes, preferences]);
    // Kênh đang hiện, mang tên hiển thị riêng: thứ mọi danh sách kênh liệt kê.
    const visibleInboxes = useMemo(
        () => channels.filter(channel => !channel.isHidden).map(channel => ({ ...channel.inbox, name: channel.label })),
        [channels],
    );

    const reorder = useCallback(
        (orderedInboxIds: number[]) => savePreferences({ ...preferences, order: orderedInboxIds }),
        [preferences],
    );

    const toggleHidden = useCallback(
        (inboxId: number) =>
            savePreferences({
                ...preferences,
                hidden: preferences.hidden.includes(inboxId)
                    ? preferences.hidden.filter(hiddenId => hiddenId !== inboxId)
                    : [...preferences.hidden, inboxId],
            }),
        [preferences],
    );

    const rename = useCallback(
        (inboxId: number, alias: string) => {
            const key = String(inboxId);
            const aliases = { ...preferences.aliases };
            const trimmed = alias.trim();
            const originalName = inboxes.find(candidate => candidate.id === inboxId)?.name;
            if (!trimmed || trimmed === originalName) delete aliases[key];
            else aliases[key] = trimmed;
            if (aliases[key] === preferences.aliases[key]) return;
            savePreferences({ ...preferences, aliases });
        },
        [inboxes, preferences],
    );

    return { channels, visibleInboxes, reorder, toggleHidden, rename };
}
