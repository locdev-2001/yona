import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageProps: {
    currentAccountUser: { role: 'agent' | 'administrator' };
    inboxes: { id: number }[];
} = { currentAccountUser: { role: 'administrator' }, inboxes: [] };

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: pageProps }),
}));

const conversationState = { isOnExpandedLayout: true, listLoading: false };

vi.mock('./ConversationContext', () => ({
    ConversationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useConversation: () => ({ ...conversationState, selectedConversation: null, uiSettings: {} }),
}));

vi.mock('../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./chatlist/ChatList', () => ({ default: () => <div data-testid="chat-list" /> }));
vi.mock('./conversationbox/ConversationBox', () => ({ default: () => <div data-testid="conversation-box" /> }));
vi.mock('./conversationbox/ConversationSidebar', () => ({ default: () => null }));
vi.mock('./conversationbox/OnboardingView', () => ({ default: () => <div data-testid="admin-onboarding" /> }));
vi.mock('dashboard/commands/CmdBarConversationSnooze', () => ({ default: () => null }));
vi.mock('dashboard/commands/useConversationHotKeys', () => ({ useConversationHotKeys: () => undefined }));
vi.mock('dashboard/commands/useMacroHotKeys', () => ({ useMacroHotKeys: () => undefined }));
vi.mock('./contactPanelVisibility', () => ({ useContactPanelOpen: () => false }));

import ConversationView from './ConversationView';

// Bố cục hai-màn (điện thoại, hoặc đã bấm ⇥) chỉ dựng khung chat khi đã chọn hội
// thoại; màn bắt đầu của quản trị viên phải hiện được ở đó chứ không chỉ ở màn rộng.
describe('màn bắt đầu của quản trị viên ở bố cục hai-màn', () => {
    beforeEach(() => {
        pageProps.currentAccountUser = { role: 'administrator' };
        pageProps.inboxes = [];
        conversationState.isOnExpandedLayout = true;
        conversationState.listLoading = false;
    });

    it('thay danh sách rỗng bằng màn bắt đầu khi account chưa có hộp thư', () => {
        render(<ConversationView />);

        expect(screen.getByTestId('admin-onboarding')).toBeInTheDocument();
        expect(screen.queryByTestId('chat-list')).not.toBeInTheDocument();
    });

    it('nhân viên vẫn thấy danh sách như cũ', () => {
        pageProps.currentAccountUser = { role: 'agent' };

        render(<ConversationView />);

        expect(screen.getByTestId('chat-list')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-onboarding')).not.toBeInTheDocument();
    });

    it('account đã có hộp thư thì giữ danh sách', () => {
        pageProps.inboxes = [{ id: 1 }];

        render(<ConversationView />);

        expect(screen.getByTestId('chat-list')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-onboarding')).not.toBeInTheDocument();
    });

    it('đang tải danh sách thì chưa quyết định', () => {
        conversationState.listLoading = true;

        render(<ConversationView />);

        expect(screen.queryByTestId('admin-onboarding')).not.toBeInTheDocument();
    });

    it('bố cục ba cột giữ nguyên: màn bắt đầu nằm trong khung chat', () => {
        conversationState.isOnExpandedLayout = false;

        render(<ConversationView />);

        expect(screen.getByTestId('chat-list')).toBeInTheDocument();
        expect(screen.getByTestId('conversation-box')).toBeInTheDocument();
    });
});
