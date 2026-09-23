import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageProps: {
    currentAccountUser: { role: 'agent' | 'administrator' };
    inboxes: { id: number; name: string; channel_type: string }[];
} = { currentAccountUser: { role: 'administrator' }, inboxes: [] };

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            ...pageProps,
            currentAccount: { id: 2, name: 'Shop Hoa', features: {} },
            auth: { user: { id: 1, name: 'Lan' } },
            globalConfig: { installationName: 'Yona' },
        },
    }),
    Link: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const conversationState = {
    conversations: [] as { id: number }[],
    listLoading: false,
};

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        ...conversationState,
        assigneeTab: 'all',
        listMeta: { mine_count: 0, unassigned_count: 0, all_count: 0 },
        appliedFilters: null,
        setAssigneeTab: vi.fn(),
    }),
}));

import EmptyState from './EmptyState';

describe('EmptyState when the account has no inbox', () => {
    beforeEach(() => {
        pageProps.inboxes = [];
        conversationState.listLoading = false;
    });

    it('shows the getting-started view to an administrator, with a card that opens the channel picker', () => {
        pageProps.currentAccountUser = { role: 'administrator' };

        render(<EmptyState />);

        expect(screen.getByText(/Welcome to Yona/)).toBeInTheDocument();
        expect(screen.queryByText(/not part of any inbox/)).not.toBeInTheDocument();

        const createInboxLink = screen.getByRole('link', { name: /Connect Zalo, your website or email/ });
        expect(createInboxLink).toHaveAttribute('href', '/app/accounts/2/settings/inboxes/new');
        expect(screen.getByRole('link', { name: /invite a team member/ })).toHaveAttribute(
            'href',
            '/app/accounts/2/settings/agents/list',
        );
        expect(screen.getByRole('link', { name: /canned response/ })).toHaveAttribute(
            'href',
            '/app/accounts/2/settings/canned-response/list',
        );
        expect(screen.getByRole('link', { name: /create tags/ })).toHaveAttribute(
            'href',
            '/app/accounts/2/settings/labels/list',
        );
    });

    it('tells an agent to ask an administrator, without the getting-started view', () => {
        pageProps.currentAccountUser = { role: 'agent' };

        render(<EmptyState />);

        expect(screen.getByText(/not part of any inbox/)).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('waits for the conversation list before deciding what to show', () => {
        pageProps.currentAccountUser = { role: 'administrator' };
        conversationState.listLoading = true;

        render(<EmptyState />);

        expect(screen.queryByText(/Welcome to Yona/)).not.toBeInTheDocument();
    });
});

describe('EmptyState when the account has inboxes', () => {
    it('never shows the getting-started view, even to an administrator', () => {
        pageProps.currentAccountUser = { role: 'administrator' };
        pageProps.inboxes = [{ id: 1, name: 'Zalo shop', channel_type: 'Channel::Zalo' }];
        conversationState.listLoading = false;

        render(<EmptyState />);

        expect(screen.queryByText(/Welcome to Yona/)).not.toBeInTheDocument();
        expect(screen.getByText(/no messages from customers/)).toBeInTheDocument();
    });
});
