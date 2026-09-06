import type { ReactNode } from 'react';

import { useInboxCapabilities } from 'shared/composables/useInboxCapabilities';
import type { ChannelCapability, InboxWithCapabilities } from 'shared/constants/channelCapabilities';

interface IfSupportsProps {
    inbox: InboxWithCapabilities | null | undefined;
    cap: ChannelCapability | ChannelCapability[];
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Cổng hiển thị theo năng lực kênh: "không hỗ trợ = không hiện"
 * (docs/channel-capabilities.md §1.4). Nhiều `cap` = cần ĐỦ cả bộ.
 */
export default function IfSupports({ inbox, cap, children, fallback = null }: IfSupportsProps) {
    const { supports } = useInboxCapabilities(inbox);
    const required = Array.isArray(cap) ? cap : [cap];

    return <>{required.every(supports) ? children : fallback}</>;
}
