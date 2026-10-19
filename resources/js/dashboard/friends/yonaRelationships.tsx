import { useEffect, useSyncExternalStore } from 'react';
import type { MouseEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { openProfile } from 'dashboard/contacts/profile/profileOverlay';
import { getJson } from 'dashboard/helper/apiClient';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { useFriendshipChanges } from './useFriendshipChanges';

// Người dùng Yona trong hộp thư: contact_id → đã là bạn bè chưa. Hồ sơ không thuộc kênh
// Yona (Zalo, email) không có trong bảng nên không bị coi là người lạ.
let friendByContactId = new Map<number, boolean>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

async function loadRelationships(accountId: number): Promise<void> {
    const response = await getJson<{ payload: { contact_id: number; is_friend: boolean }[] }>(
        `/api/v1/accounts/${accountId}/yona/contacts`,
    ).catch(() => null);
    if (!response) return;

    friendByContactId = new Map(response.payload.map(row => [row.contact_id, row.is_friend]));
    listeners.forEach(listener => listener());
}

// Gắn một lần trong Dashboard: tải bảng, tải lại khi quan hệ bạn bè đổi hay có hội thoại mới.
export function YonaRelationshipsSync() {
    const accountId = usePage<DashboardPageProps>().props.currentAccount?.id ?? 0;
    const reload = () => {
        if (accountId) void loadRelationships(accountId);
    };

    useEffect(reload, [accountId]);
    useFriendshipChanges(reload);
    useRealtimeEvent('conversation.created', reload);

    return null;
}

// Nút thêm bạn ở góc dưới thẻ hội thoại với người dùng Yona chưa kết bạn (cùng cỡ nút
// đầu cột danh sách); bấm là mở hồ sơ để kết bạn.
export function useIsStranger(contactId: number | undefined): boolean {
    return useSyncExternalStore(subscribe, () => contactId !== undefined && friendByContactId.get(contactId) === false);
}

export function StrangerBadge({ contactId, className = '' }: { contactId: number | undefined; className?: string }) {
    const isStranger = useIsStranger(contactId);
    if (contactId === undefined || !isStranger) return null;

    const viewProfile = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        openProfile(contactId);
    };

    return (
        <button
            type="button"
            className={`grid place-content-center size-6 max-md:size-8 shrink-0 rounded-lg bg-n-slate-9/10 hover:bg-n-slate-9/20 text-n-slate-12 transition-colors active:scale-[0.97] ${className}`}
            title={t('FRIENDS.PROFILE.NOT_FRIEND_HINT')}
            aria-label={t('FRIENDS.PROFILE.NOT_FRIEND_HINT')}
            onClick={viewProfile}
        >
            <span className="i-lucide-user-round-plus size-3.5 max-md:size-4" />
        </button>
    );
}
