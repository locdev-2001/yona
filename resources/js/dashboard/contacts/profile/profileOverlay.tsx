import { useEffect, useSyncExternalStore } from 'react';
import { usePage } from '@inertiajs/react';

import ContactProfile from './ContactProfile';

// Hồ sơ mở ngay trên trang đang xem, không chuyển trang: trang phía sau (danh sách bạn bè,
// khung chat) giữ nguyên trạng thái. Lưu ở module vì mỗi trang Inertia dựng lại Dashboard.
let openContactId: number | null = null;
const listeners = new Set<() => void>();

function setOpenContactId(contactId: number | null): void {
    openContactId = contactId;
    listeners.forEach(listener => listener());
}

export const openProfile = (contactId: number) => setOpenContactId(contactId);
export const closeProfile = () => setOpenContactId(null);

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Gắn một lần trong Dashboard. Chuyển trang (bấm Nhắn tin, đi trang khác) thì đóng hồ sơ.
export function ProfileOverlay() {
    const contactId = useSyncExternalStore(subscribe, () => openContactId);
    const pageUrl = usePage().url;

    useEffect(closeProfile, [pageUrl]);

    return contactId === null ? null : <ContactProfile key={contactId} contactId={contactId} onClose={closeProfile} />;
}
