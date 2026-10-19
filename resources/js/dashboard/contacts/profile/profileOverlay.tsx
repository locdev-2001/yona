import { useEffect, useSyncExternalStore } from 'react';
import { usePage } from '@inertiajs/react';

import ContactProfile from './ContactProfile';

// Hồ sơ mở ngay trên trang đang xem, không chuyển trang: trang phía sau (danh sách bạn bè,
// khung chat) giữ nguyên trạng thái. Lưu ở module vì mỗi trang Inertia dựng lại Dashboard.
interface OpenProfile {
    contactId: number;
    // Người dùng tự đóng hồ sơ (Esc, ✕, nền mờ): nơi mở hồ sơ hiện lại (vd hộp tìm người).
    onDismiss?: () => void;
}

let openState: OpenProfile | null = null;
const listeners = new Set<() => void>();

function setOpenState(next: OpenProfile | null): void {
    openState = next;
    listeners.forEach(listener => listener());
}

export const openProfile = (contactId: number, options: { onDismiss?: () => void } = {}) =>
    setOpenState({ contactId, onDismiss: options.onDismiss });

export function closeProfile(): void {
    const dismissed = openState;
    setOpenState(null);
    dismissed?.onDismiss?.();
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Gắn một lần trong Dashboard. Chuyển trang (bấm Nhắn tin, đi trang khác) thì bỏ hồ sơ,
// không gọi onDismiss vì người dùng đã đi tiếp.
export function ProfileOverlay() {
    const state = useSyncExternalStore(subscribe, () => openState);
    const pageUrl = usePage().url;

    useEffect(() => setOpenState(null), [pageUrl]);

    return state === null ? null : <ContactProfile key={state.contactId} contactId={state.contactId} onClose={closeProfile} />;
}
