import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import type { SearchFile } from '../types';
import SearchResultFileItem from './SearchResultFileItem';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
    usePage: () => ({ props: { inboxes: [{ id: 4, name: 'Zalo Shop', channel_type: 'Channel::Zalo' }] } }),
}));

function buildFile(overrides: Partial<SearchFile> = {}): SearchFile {
    return {
        id: 91,
        messageId: 5012,
        fileType: 'file',
        extension: 'pdf',
        contentType: 'application/pdf',
        dataUrl: 'https://yona.test/attachments/91/token/Báo%20giá%20T9.pdf',
        thumbUrl: '',
        fileSize: 20480,
        fileName: 'Báo giá T9.pdf',
        createdAt: 1758690000,
        message: {
            id: 5012,
            content: null,
            inboxId: 4,
            conversationId: 12,
            private: false,
            createdAt: 1758690000,
            contentAttributes: { sender: { external_id: 'u-1', name: 'Lan Anh' } },
            sender: { name: 'Hội Khách Sỉ' },
        },
        ...overrides,
    };
}

beforeAll(() => setLocale('vi'));

afterEach(() => vi.restoreAllMocks());

describe('SearchResultFileItem', () => {
    it('tô đậm đoạn khớp không dấu trong tên tệp', () => {
        const { container } = render(<SearchResultFileItem file={buildFile()} accountId={2} query="bao gia" />);

        expect(container.querySelector('mark')?.textContent).toBe('Báo giá');
    });

    it('mở hội thoại tại đúng tin chứa tệp', () => {
        render(<SearchResultFileItem file={buildFile()} accountId={2} query="bao" />);

        expect(screen.getByRole('link').getAttribute('href')).toBe('/app/accounts/2/conversations/12?messageId=5012');
    });

    it('nút mở tệp mở tab mới và không nằm trong liên kết của thẻ', () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        render(<SearchResultFileItem file={buildFile()} accountId={2} query="bao" />);

        const button = screen.getByRole('button', { name: 'Mở tệp' });
        fireEvent.click(button);

        expect(open).toHaveBeenCalledWith(buildFile().dataUrl, '_blank', 'noopener,noreferrer');
        expect(screen.getByRole('link').contains(button)).toBe(false);
    });

    it('hiện người gửi thật của tin nhóm, hộp thư và mã hội thoại', () => {
        render(<SearchResultFileItem file={buildFile()} accountId={2} query="bao" />);

        expect(screen.getByText('Lan Anh')).toBeInTheDocument();
        expect(screen.queryByText('Hội Khách Sỉ')).not.toBeInTheDocument();
        expect(screen.getByText('Zalo Shop')).toBeInTheDocument();
        expect(screen.getByText('#12')).toBeInTheDocument();
    });

    it('lấy tên từ đường dẫn khi thiếu tên tệp, không có gì thì ghi tệp không tên', () => {
        const { rerender } = render(
            <SearchResultFileItem file={buildFile({ fileName: null })} accountId={2} query="bao" />,
        );
        expect(screen.getByRole('link').textContent).toBe('Báo giá T9.pdf');

        rerender(<SearchResultFileItem file={buildFile({ fileName: null, dataUrl: null })} accountId={2} query="x" />);
        expect(screen.getByRole('link').textContent).toBe('Tệp không tên');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hiện ảnh thu nhỏ cho tệp ảnh', () => {
        const { container } = render(
            <SearchResultFileItem
                file={buildFile({ fileType: 'image', thumbUrl: 'https://yona.test/anh.png', fileName: 'anh-ck.png' })}
                accountId={2}
                query="anh"
            />,
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://yona.test/anh.png');
    });
});
