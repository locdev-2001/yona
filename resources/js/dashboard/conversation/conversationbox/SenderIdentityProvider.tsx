import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { SenderIdentityContext } from 'dashboard/components-next/message/SenderIdentityContext';
import type { ConversationSenderIdentity } from 'dashboard/components-next/message/SenderIdentityContext';
import { useInstallationPlatform } from 'shared/composables/useInstallationPlatform';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';

/** Danh tính hộp thư của hội thoại đang mở cho khung tin: ảnh tài khoản kênh, nền tảng, và badge bản cài đặt. */
export default function SenderIdentityProvider({ children }: { children: ReactNode }) {
    const { selectedConversation } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const installation = useInstallationPlatform();

    const inbox = inboxes.find(item => item.id === selectedConversation?.inbox_id) ?? null;
    const inboxName = inbox?.name ?? null;
    const inboxAvatarUrl = inbox?.avatar_url ?? '';
    const inboxPlatform = inbox?.platform ?? null;

    const identity = useMemo<ConversationSenderIdentity>(
        () => ({
            channelAccount:
                inboxName === null ? null : { name: inboxName, avatarUrl: inboxAvatarUrl, platform: inboxPlatform },
            installation,
        }),
        [inboxName, inboxAvatarUrl, inboxPlatform, installation],
    );

    return <SenderIdentityContext.Provider value={identity}>{children}</SenderIdentityContext.Provider>;
}
