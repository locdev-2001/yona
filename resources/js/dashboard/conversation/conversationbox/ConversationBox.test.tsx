import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const visibility = vi.hoisted(() => ({ integrations: false }));
vi.mock('shared/helpers/productVisibility', () => ({ isProductFeatureVisible: () => visibility.integrations }));
vi.mock('../ConversationContext', () => ({ useConversation: () => ({ accountId: 2, selectedConversation: { id: 4 }, isOnExpandedLayout: false }) }));
vi.mock('dashboard/composables/useDashboardApps', () => ({ useDashboardApps: () => ({ apps: [{ id: 7, title: 'CRM đã cấu hình' }] }) }));
vi.mock('dashboard/components/ui/Tabs', () => ({ default: ({ onChange }: { onChange: (index: number) => void }) => <button onClick={() => onChange(1)}>CRM đã cấu hình</button> }));
vi.mock('dashboard/components/widgets/DashboardApp/Frame', () => ({ default: () => <iframe title="CRM" /> }));
vi.mock('./ConversationHeader', () => ({ default: () => <div>Đầu hội thoại</div> }));
vi.mock('./EmptyState', () => ({ default: () => null }));
vi.mock('./MessagesView', () => ({ default: () => <div>Tin nhắn</div> }));
vi.mock('./SenderIdentityProvider', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

import ConversationBox from './ConversationBox';

describe('Dashboard Apps trong hội thoại tinh gọn', () => {
    beforeEach(() => { visibility.integrations = false; });

    it('ẩn tab và iframe dù workspace đã cấu hình ứng dụng', () => {
        render(<ConversationBox />);
        expect(screen.getByText('Tin nhắn').parentElement?.style.display).toBe('');
        expect(screen.queryByRole('button', { name: 'CRM đã cấu hình' })).toBeNull();
        expect(screen.queryByTitle('CRM')).toBeNull();
    });

    it('luôn hiện tin nhắn khi tắt integrations trong lúc tab ứng dụng đang mở', () => {
        visibility.integrations = true;
        const view = render(<ConversationBox />);
        fireEvent.click(screen.getByRole('button', { name: 'CRM đã cấu hình' }));
        expect(screen.getByText('Tin nhắn').parentElement?.style.display).toBe('none');
        visibility.integrations = false;
        view.rerender(<ConversationBox />);
        expect(screen.getByText('Tin nhắn').parentElement?.style.display).toBe('');
        expect(screen.queryByTitle('CRM')).toBeNull();
    });
});
