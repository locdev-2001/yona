import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
import ConversationCard from './ConversationCard';
import type { ContactMeta, Conversation } from '../../../conversation/types';

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { auth: { user: { id: 2 } } } }) }));

vi.mock('dashboard/realtime/hooks', () => ({
    useContactAvailabilityStatus: () => 'offline',
}));

const CONTACT = { id: 5, name: 'Pham Nguyen', thumbnail: '/pham.png' } as ContactMeta;

const CONVERSATION = {
    id: 138,
    inbox_id: 59,
    unread_count: 0,
    status: 'open',
    priority: null,
    labels: [],
    messages: [],
    timestamp: 1756707112,
    created_at: 1756707112,
    meta: { sender: CONTACT, channel: 'Channel::Zalo' },
    last_non_activity_message: null,
} as unknown as Conversation;

const badgeOf = (container: HTMLElement) => container.querySelector('[data-testid="avatar-platform-badge"]');

const ZALO_INBOX = {
    name: 'Nguyễn Phước Lộc',
    channel_type: 'Channel::Zalo',
    platform: { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.webp' },
};

describe('thẻ hội thoại trong danh sách', () => {
    // Nền tảng đã hiện ở dòng tên hộp thư phía trên, avatar không vẽ badge lặp lại.
    it('avatar khách không mang badge nền tảng', () => {
        const { container } = render(
            <ConversationCard chat={CONVERSATION} currentContact={CONTACT} inbox={ZALO_INBOX} showInboxName />,
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/pham.png');
        expect(badgeOf(container)).toBeNull();
    });

    it.each([
        { isSelecting: false, selected: false, hasCheckbox: false },
        { isSelecting: true, selected: false, hasCheckbox: true },
        { isSelecting: false, selected: true, hasCheckbox: true },
    ])('checkbox chọn nhiều chỉ hiện ở chế độ chọn hoặc khi đã chọn: %o', ({ isSelecting, selected, hasCheckbox }) => {
        const { container } = render(
            <ConversationCard
                chat={CONVERSATION}
                currentContact={CONTACT}
                isSelecting={isSelecting}
                selected={selected}
            />,
        );

        expect(container.querySelector('input[type="checkbox"]') !== null).toBe(hasCheckbox);
    });

    it('avatar hình khối chỉ chuyển động khi đang trỏ vào thẻ', () => {
        const { container } = render(
            <ConversationCard chat={CONVERSATION} currentContact={{ ...CONTACT, thumbnail: '' }} />,
        );
        const card = container.querySelector('.conversation') as HTMLElement;
        const lively = () => container.querySelector('[data-generated-avatar] .mo-always') !== null;

        expect(lively()).toBe(false);
        fireEvent.mouseEnter(card);
        expect(lively()).toBe(true);
        fireEvent.mouseLeave(card);
        expect(lively()).toBe(false);
    });

    it('rê chuột vào avatar không hiện checkbox', () => {
        const { container } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} />);

        fireEvent.mouseEnter(container.querySelector('img')!.parentElement!);

        expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    });

    describe('cột thời gian', () => {
        afterEach(() => setLocale('en'));

        // Thời gian nằm cùng hàng với tên để tên tự nhường đúng bề rộng chữ thời gian.
        // Chỉ hiện mốc tin mới nhất; tuổi hội thoại không còn trên thẻ.
        it('chỉ hiện thời gian tin mới nhất, ở hàng trên cùng chứ không ở hàng tên khách', () => {
            setLocale('vi');
            const now = Math.floor(Date.now() / 1000);
            const chat = { ...CONVERSATION, created_at: now - 15 * 86400, timestamp: now - 25 * 60 } as Conversation;

            const { container, getByText, queryByText } = render(<ConversationCard chat={chat} currentContact={CONTACT} />);
            const name = container.querySelector('h4.conversation--user');
            const time = getByText('25 phút');

            expect(name?.parentElement?.contains(time)).toBe(false);
            expect(queryByText(/15 ngày/)).toBeNull();
        });
    });

    it('đang tìm trong danh sách thì tô đoạn khớp trên tên khách và tin cuối', () => {
        const chat = {
            ...CONVERSATION,
            last_non_activity_message: { id: 1, content: 'Đơn của chị Nguyên đã giao', message_type: 0, attachments: [] },
        } as unknown as Conversation;

        const { container } = render(<ConversationCard chat={chat} currentContact={CONTACT} highlightQuery="nguyen" />);
        const marks = [...container.querySelectorAll('mark')].map(mark => mark.textContent);

        expect(marks).toEqual(['Nguyen', 'Nguyên']);
    });

    it.each([
        { case: 'tin của chính mình mở đầu bằng "You:", bỏ icon trả lời', last: { message_type: 1, sender: { id: 2, name: 'Robert Nguyen', type: 'user' } }, prefix: 'You: ' },
        { case: 'tin nhóm mở đầu bằng tên thành viên', last: { message_type: 0, content_attributes: { sender: { external_id: 'u9', name: 'Kha Phan' } } }, prefix: 'Kha Phan: ' },
    ])('dòng xem trước: $case', ({ last, prefix }) => {
        const chat = {
            ...CONVERSATION,
            last_non_activity_message: { id: 1, content: 'Chào chị', attachments: [], content_attributes: {}, ...last },
        } as unknown as Conversation;

        const { getByTestId } = render(<ConversationCard chat={chat} currentContact={CONTACT} inbox={ZALO_INBOX} />);
        const sender = getByTestId('preview-sender');

        expect(sender.textContent).toBe(prefix);
        expect(sender.parentElement?.textContent?.trim()).toBe(`${prefix}Chào chị`);
    });

    it('tin khách 1-1 không mang tên người gửi', () => {
        const chat = {
            ...CONVERSATION,
            last_non_activity_message: { id: 1, content: 'Chào shop', message_type: 0, attachments: [], content_attributes: {} },
        } as unknown as Conversation;

        const { queryByTestId } = render(<ConversationCard chat={chat} currentContact={CONTACT} />);

        expect(queryByTestId('preview-sender')).toBeNull();
    });

    it('không tìm thì không tô gì', () => {
        const { container } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} />);

        expect(container.querySelector('mark')).toBeNull();
    });

    describe('dòng trên và góc phải dưới', () => {
        const ASSIGNEE = { id: 7, name: 'Robert Nguyen', available_name: 'Robert Nguyen', thumbnail: '' };
        afterEach(() => setLocale('en'));

        it('dòng trên là logo nền tảng và tên hộp thư', () => {
            const { container, getByText } = render(
                <ConversationCard chat={CONVERSATION} currentContact={CONTACT} inbox={ZALO_INBOX} showInboxName />,
            );

            expect(getByText('Nguyễn Phước Lộc')).toBeTruthy();
            expect(container.querySelector('img[data-platform="zalo"]')?.getAttribute('src')).toBe(
                '/brand-assets/platforms/zalo.webp',
            );
        });

        it('người khác phụ trách thì hiện avatar và tên ở góc phải dưới, không còn ở dòng trên', () => {
            const { getByTestId } = render(
                <ConversationCard
                    chat={CONVERSATION}
                    currentContact={CONTACT}
                    inbox={ZALO_INBOX}
                    showInboxName
                    assignee={ASSIGNEE}
                    showAssignee
                />,
            );
            const assignee = getByTestId('card-assignee');

            expect(assignee.dataset.assignee).toBe('other');
            expect(assignee.textContent).toBe('Robert Nguyen');
            expect(assignee.title).toBe('Robert Nguyen');
            expect(assignee.querySelector('[data-generated-avatar], img')).not.toBeNull();
        });

        // Người dùng đang đăng nhập có id 2 (mock usePage).
        it.each([
            { variant: 'me', assignee: { id: 2, name: 'Tôi' }, assigneeType: 'User', text: 'Tôi phụ trách' },
            { variant: 'other', assignee: { id: 2, name: 'Bot trả lời' }, assigneeType: 'AgentBot', text: 'Bot trả lời' },
            { variant: 'none', assignee: {}, assigneeType: undefined, text: 'Chưa gán' },
        ])('nhãn phụ trách theo người nhận: $variant', ({ variant, assignee, assigneeType, text }) => {
            setLocale('vi');
            const { getByTestId } = render(
                <ConversationCard
                    chat={{ ...CONVERSATION, meta: { ...CONVERSATION.meta, assignee_type: assigneeType } }}
                    currentContact={CONTACT}
                    assignee={assignee}
                    showAssignee
                />,
            );
            const badge = getByTestId('card-assignee');

            expect(badge.dataset.assignee).toBe(variant);
            expect(badge.textContent).toBe(text);
        });

        it('tab không hiện người phụ trách thì không có nhãn', () => {
            const { queryByTestId } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} assignee={ASSIGNEE} />);

            expect(queryByTestId('card-assignee')).toBeNull();
        });
    });

    describe('ghim và nút thao tác', () => {
        it('hội thoại đã ghim mang biểu tượng ghim', () => {
            const { queryByTestId, rerender } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} />);
            expect(queryByTestId('card-pinned')).toBeNull();

            rerender(<ConversationCard chat={{ ...CONVERSATION, pinned: true }} currentContact={CONTACT} />);
            expect(queryByTestId('card-pinned')).not.toBeNull();
        });

        it('nút "…" mở menu thao tác tại vị trí nút, không mở hội thoại', () => {
            const onOpenActions = vi.fn();
            const onClick = vi.fn();
            const { getByRole } = render(
                <ConversationCard chat={CONVERSATION} currentContact={CONTACT} onClick={onClick} onOpenActions={onOpenActions} />,
            );

            fireEvent.click(getByRole('button', { name: 'Conversation actions' }));

            expect(onOpenActions).toHaveBeenCalledWith({ x: expect.any(Number), y: expect.any(Number) });
            expect(onClick).not.toHaveBeenCalled();
        });

        it('không có nơi nhận thao tác thì không vẽ nút "…"', () => {
            const { queryByRole } = render(<ConversationCard chat={CONVERSATION} currentContact={CONTACT} />);

            expect(queryByRole('button', { name: 'Conversation actions' })).toBeNull();
        });
    });
});
