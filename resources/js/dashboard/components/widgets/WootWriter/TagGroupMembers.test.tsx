import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { SEARCH_MATCH_CLASS } from 'dashboard/helper/searchHighlight';
import TagGroupMembers from './TagGroupMembers';

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

const pressKey = (key: string) => fireEvent.keyDown(document, { key, code: key });

const MEMBERS = [
    { external_id: '555', name: 'Bình', avatar: 'https://cdn.zalo.test/binh.jpg' },
    { external_id: '777', name: 'An <Sỉ>', avatar: null },
];

function renderMembers(searchKey = '') {
    const handlers = { onSelect: vi.fn(), onClose: vi.fn(), onRemoveTrigger: vi.fn() };

    render(<TagGroupMembers caretPosition={{ top: 10, height: 20 }} searchKey={searchKey} members={MEMBERS} {...handlers} />);

    return handlers;
}

describe('TagGroupMembers', () => {
    it('hiện nhóm "Group members" với avatar và tên (tên được mã hoá, không thành thẻ HTML)', async () => {
        renderMembers();

        const listbox = await screen.findByRole('listbox');
        const options = within(listbox).getAllByRole('option');

        expect(within(listbox).getByText('Group members')).toBeTruthy();
        expect(options).toHaveLength(2);
        expect(options[0].querySelector('img')?.getAttribute('src')).toBe('https://cdn.zalo.test/binh.jpg');
        expect(options[1].textContent).toContain('An <Sỉ>');
    });

    it('tô nền đoạn khớp không dấu cùng kiểu với ô tìm kiếm', async () => {
        renderMembers('bi');

        const option = (await screen.findAllByRole('option'))[0];
        const marks = option.querySelectorAll('mark');

        expect(marks).toHaveLength(1);
        expect(marks[0].textContent).toBe('Bì');
        expect(marks[0].className).toBe(SEARCH_MATCH_CLASS);
    });

    it('tô từng từ của từ khoá dù đảo thứ tự, tên vẫn được mã hoá', async () => {
        renderMembers('si an');

        const option = (await screen.findAllByRole('option'))[1];

        expect([...option.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['An', 'Sỉ']);
        expect(option.textContent).toContain('An <Sỉ>');
        expect(option.querySelector('mark')?.innerHTML).not.toContain('<');
    });

    it('Enter chọn mục đang sáng, mũi tên xuống rồi Enter chọn mục kế', async () => {
        const { onSelect } = renderMembers();
        await screen.findByRole('listbox');

        pressKey('Enter');
        await waitFor(() => expect(onSelect).toHaveBeenLastCalledWith(MEMBERS[0]));

        pressKey('ArrowDown');
        pressKey('Enter');
        await waitFor(() => expect(onSelect).toHaveBeenLastCalledWith(MEMBERS[1]));
    });

    it('Escape đóng bảng bằng phím', async () => {
        const { onClose } = renderMembers();
        await screen.findByRole('listbox');

        pressKey('Escape');

        await waitFor(() => expect(onClose).toHaveBeenCalledWith('keyboard'));
    });
});
