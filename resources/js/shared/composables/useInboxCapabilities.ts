import { useMemo } from 'react';

import type { ChannelCapability, InboxWithCapabilities } from 'shared/constants/channelCapabilities';

// Cửa DUY NHẤT để FE hỏi kênh làm được gì (docs/channel-capabilities.md §3).
// Cấm `inbox.channel_type === '…'` để bật/tắt tính năng — channel_type chỉ còn
// dùng cho icon/nhãn kênh.

/** Bản không-hook, dùng được trong helper, vòng lặp và test. */
export function inboxSupports(
    inbox: InboxWithCapabilities | null | undefined,
    capability: ChannelCapability,
): boolean {
    return Boolean(inbox?.capabilities?.includes(capability));
}

export function useInboxCapabilities(inbox: InboxWithCapabilities | null | undefined) {
    const capabilities = useMemo<readonly string[]>(() => inbox?.capabilities ?? [], [inbox?.capabilities]);

    return useMemo(
        () => ({
            capabilities,
            // Kênh chưa khai báo (inbox cũ, payload rút gọn) = không hỗ trợ: UI ẩn
            // tính năng thay vì đoán theo loại kênh.
            supports: (capability: ChannelCapability) => capabilities.includes(capability),
            supportsAny: (...list: ChannelCapability[]) => list.some(one => capabilities.includes(one)),
        }),
        [capabilities],
    );
}
