import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2, features: {} } } }),
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: () => new Promise(() => undefined),
}));

import Editor from './Editor';
import type { EditorHandle } from './Editor';

// Ô soạn thật (ProseMirror) + bảng thành viên nhóm: gõ `@` ở chế độ Trả lời.

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
    // jsdom không đo được vị trí chữ; ProseMirror cần hai hàm này để neo bảng vào con trỏ.
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
});

const MEMBERS = [
    { external_id: '555', name: 'Bình', avatar: null },
    { external_id: '777', name: 'An', avatar: null },
    { external_id: '888', name: 'Anh Bình', avatar: null },
    { external_id: '999', name: 'Bình An', avatar: null },
];

const optionNames = () => screen.getAllByRole('option').map(option => option.querySelector('.text-sm')?.textContent);

function renderEditor({ isPrivate = false }: { isPrivate?: boolean } = {}) {
    const ref = createRef<EditorHandle>();
    const onChange = vi.fn();
    const onSend = vi.fn();

    render(
        <Editor
            ref={ref}
            value=""
            editorId="reply-1"
            placeholder=""
            isPrivate={isPrivate}
            channelType="Channel::Zalo"
            uiSettings={{ editor_message_key: 'enter' }}
            groupMembers={MEMBERS}
            onChange={onChange}
            onSend={onSend}
        />,
    );

    const type = (text: string) => act(() => ref.current?.insertText(text));
    const pressInEditor = (key: string) =>
        fireEvent.keyDown(document.querySelector('.ProseMirror') as HTMLElement, { key, code: key });

    return { type, pressInEditor, onChange, onSend };
}

describe('Editor · nhắc tên thành viên nhóm', () => {
    it('gõ @ ở chế độ Trả lời hiện bảng thành viên theo thứ tự máy chủ trả', async () => {
        const { type } = renderEditor();

        type('@');

        await screen.findAllByRole('option');
        expect(screen.getByText('Group members')).toBeTruthy();
        expect(optionNames()).toEqual(['Bình', 'An', 'Anh Bình', 'Bình An']);
    });

    it('gõ @bi lọc không dấu, Enter chèn tag thành viên chứ không gửi tin', async () => {
        const { type, pressInEditor, onChange, onSend } = renderEditor();

        type('@');
        type('bi');
        await waitFor(() => expect(optionNames()).toEqual(['Bình', 'Anh Bình', 'Bình An']));

        // Ô soạn nhường Enter cho bảng (bảng nghe ở tầng document).
        pressInEditor('Enter');

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('[@Bình](mention://member/555/B%C3%ACnh) '));
        expect(onSend).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    });

    it('gõ @an binh (có khoảng trắng, đảo thứ tự) ra Bình An; Enter thay cả cụm bằng tag', async () => {
        const { type, pressInEditor, onChange, onSend } = renderEditor();

        type('@an');
        type(' ');
        type('binh');
        await waitFor(() => expect(optionNames()).toEqual(['Bình An', 'Anh Bình']));

        pressInEditor('Enter');

        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('[@Bình An](mention://member/999/B%C3%ACnh%20An) '));
        expect(onSend).not.toHaveBeenCalled();
    });

    it('gõ tiếp câu sau @ tới khi không còn ai khớp thì bảng đóng và Enter gửi tin', async () => {
        const { type, pressInEditor, onSend } = renderEditor();

        type('@an');
        await screen.findAllByRole('option');
        type(' oi mai hop');

        await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
        pressInEditor('Enter');
        expect(onSend).toHaveBeenCalledTimes(1);
    });

    it('không ai khớp thì không mở bảng và Enter gửi tin như thường', async () => {
        const { type, pressInEditor, onSend } = renderEditor();

        type('@xyz');
        pressInEditor('Enter');

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(onSend).toHaveBeenCalledTimes(1);
    });

    it('Lưu ý riêng không hiện thành viên nhóm', async () => {
        const { type } = renderEditor({ isPrivate: true });

        type('@');

        await waitFor(() => expect(screen.queryByText('Group members')).toBeNull());
        expect(screen.queryByText('Bình')).toBeNull();
    });
});
