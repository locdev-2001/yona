import { usePage } from '@inertiajs/react';

import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';

// Account chưa có hộp thư: quản trị viên thấy màn bắt đầu (tạo hộp thư, mời
// đồng đội…); nhân viên thì chỉ còn cách nhờ quản trị viên gán hộp thư.
export function useShowAdminOnboarding(): boolean {
    const { listLoading } = useConversation();
    const { inboxes = [], currentAccountUser } = usePage<DashboardPageProps>().props;

    return !listLoading && !inboxes.length && currentAccountUser?.role === 'administrator';
}
