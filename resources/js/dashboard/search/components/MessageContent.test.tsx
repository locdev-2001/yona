import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import type { SearchMessage } from '../types';
import MessageContent from './MessageContent';
import SearchResultMessagesList from './SearchResultMessagesList';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    usePage: () => ({ props: { inboxes: [] } }),
}));

function buildMessage(overrides: Partial<SearchMessage> = {}): SearchMessage {
    return {
        id: 7,
        content: 'Anh xem báo giá giúp em',
        inboxId: 4,
        conversationId: 12,
        private: false,
        createdAt: 1758690000,
        sender: { name: 'Hội Khách Sỉ Miền Tây' },
        ...overrides,
    };
}

beforeAll(() => setLocale('vi'));

describe('MessageContent', () => {
    it('tô đậm đoạn khớp không dấu', () => {
        const { container } = render(<MessageContent message={buildMessage()} searchTerm="bao gia" />);

        expect(container.querySelector('mark')?.textContent).toBe('báo giá');
    });

    describe('tin dài bị thu gọn một dòng', () => {
        const longMessage = buildMessage({
            content: 'Chào chị, hôm qua em đã gửi mẫu áo thun cổ tròn, hôm nay em gửi lại chị bảng giá sỉ tháng 10 nhé',
        });

        afterEach(() => vi.restoreAllMocks());

        it('bắt đầu đoạn trích ngay trước từ khoá, mở bằng "…", bấm Xem thêm thì hiện đủ', () => {
            vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120);
            const { container } = render(<MessageContent message={longMessage} searchTerm="bang gia thang 10" />);
            const content = container.querySelector('.message-content')!;

            expect(content.textContent?.trim()).toBe('…em gửi lại chị bảng giá sỉ tháng 10 nhé');
            expect(container.querySelector('mark')?.textContent).toBe('bảng giá');
            expect(content.parentElement!.className).toContain('line-clamp-2');

            fireEvent.click(screen.getByRole('button', { name: 'Xem thêm' }));

            expect(container.querySelector('.message-content')!.textContent?.trim()).toBe(longMessage.content);
        });

        it('không cắt khi tin vừa một dòng', () => {
            const { container } = render(<MessageContent message={longMessage} searchTerm="bang gia" />);

            expect(container.querySelector('.message-content')!.textContent?.trim()).toBe(longMessage.content);
        });
    });

    it('hiện nội dung có thẻ HTML thành chữ, không dựng thẻ', () => {
        const { container } = render(
            <MessageContent message={buildMessage({ content: '<img src=x onerror=alert(1)>' })} searchTerm="img" />,
        );

        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    });
});

describe('SearchResultMessagesList', () => {
    it('ghi tên người gửi thật của tin nhóm, không phải tên nhóm', () => {
        render(
            <SearchResultMessagesList
                accountId={2}
                query="bao gia"
                messages={[buildMessage({ contentAttributes: { sender: { external_id: 'u-1', name: 'Lan Anh' } } })]}
            />,
        );

        expect(screen.getByText(/Lan Anh/)).toBeInTheDocument();
        expect(screen.queryByText(/Hội Khách Sỉ Miền Tây/)).not.toBeInTheDocument();
    });

    it('ghi tên người gửi của tin thường', () => {
        render(<SearchResultMessagesList accountId={2} query="bao gia" messages={[buildMessage({ sender: { name: 'Chị Hoa' } })]} />);

        expect(screen.getByText(/Chị Hoa/)).toBeInTheDocument();
    });
});
