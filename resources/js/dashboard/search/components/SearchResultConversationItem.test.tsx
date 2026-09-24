import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import SearchResultConversationItem from './SearchResultConversationItem';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

beforeAll(() => setLocale('vi'));

describe('SearchResultConversationItem', () => {
    it('ghi thành viên nhóm khớp từ khoá và tô đậm tên đó', () => {
        const { container } = render(
            <SearchResultConversationItem
                id={12}
                accountId={2}
                name="Hội Khách Sỉ Miền Tây"
                matchedMemberName="Lan Anh"
                query="lan anh"
            />,
        );

        expect(screen.getByText('Thành viên:')).toBeInTheDocument();
        expect([...container.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['Lan Anh']);
    });

    it('tô đậm tên nhóm khớp không dấu và không ghi thành viên khi không có', () => {
        const { container } = render(
            <SearchResultConversationItem id={12} accountId={2} name="Hội Khách Sỉ Miền Tây" query="hoi khach" />,
        );

        expect(container.querySelector('mark')?.textContent).toBe('Hội Khách');
        expect(screen.queryByText('Thành viên:')).not.toBeInTheDocument();
    });
});
