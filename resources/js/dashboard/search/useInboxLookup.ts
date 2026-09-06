import { usePage } from '@inertiajs/react';

import type { DashboardPageProps } from '../types';

// Thay cho composable useInbox của Chatwoot (store inboxes) — danh sách inbox
// đã được SetCurrentAccount chia sẻ sang mọi trang dashboard.
export interface SidebarInbox {
    id: number;
    name: string;
    channel_type: string;
    reauthorization_required?: boolean;
}

export function useInboxLookup(): (inboxId?: number | null) => SidebarInbox | undefined {
    const { inboxes = [] } = usePage<DashboardPageProps>().props;

    return (inboxId?: number | null) => (inboxId ? inboxes.find(inbox => inbox.id === inboxId) : undefined);
}
