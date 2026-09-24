import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { widgetStore } from '../store/widgetStore';
import ChatInputWrap from './ChatInputWrap';
import { readComposerDraft } from './composer/composerStorage';

const imageFile = (name: string) => new File(['x'], name, { type: 'image/png' });

const renderComposer = () => {
    const handlers = { onSendMessage: vi.fn(), onSendFiles: vi.fn(), onSendSticker: vi.fn() };
    render(<ChatInputWrap {...handlers} />);
    return handlers;
};

const sendButton = () => screen.getByRole('button', { name: 'Send' });

beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.URL.createObjectURL = vi.fn(() => 'blob:preview');
    window.URL.revokeObjectURL = vi.fn();
    act(() => {
        widgetStore.setAppConfig({ enableFileUpload: true, enableEmojiPicker: true });
        widgetStore.setMessagingPolicy({ recallWindowSeconds: 300, stickers: [] });
    });
});

afterEach(() => vi.restoreAllMocks());

describe('ChatInputWrap', () => {
    it('nút gửi xám khi ô rỗng, đổi sang màu nhấn khi có chữ và gửi bằng Enter', () => {
        const { onSendMessage } = renderComposer();
        expect(sendButton()).toHaveAttribute('data-state', 'idle');

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Chào shop' } });
        expect(sendButton()).toHaveAttribute('data-state', 'ready');

        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onSendMessage).toHaveBeenCalledWith('Chào shop');
        expect(input).toHaveValue('');
    });

    it('menu + mở hai mục trên lớp phủ, bấm lớp phủ thì đóng', () => {
        renderComposer();
        fireEvent.click(screen.getByRole('button', { name: 'Add photo or file' }));

        expect(screen.getByRole('menuitem', { name: /Photos/ })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Files/ })).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('attach-menu-scrim'));
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('nhiều ảnh vào khay, đếm số ảnh, gửi MỘT lần kèm chú thích', () => {
        const { onSendFiles, onSendMessage } = renderComposer();
        const files = [imageFile('a.png'), imageFile('b.png')];

        fireEvent.change(screen.getByTestId('composer-image-input'), { target: { files } });

        expect(screen.getByText('2 photos selected')).toBeInTheDocument();
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('placeholder', 'Add a caption…');

        fireEvent.click(screen.getAllByRole('button', { name: /^Remove/ })[1]);
        expect(screen.getByText('1 photo selected')).toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'Mẫu này' } });
        fireEvent.click(sendButton());

        expect(onSendFiles).toHaveBeenCalledWith([files[0]], 'Mẫu này');
        expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('có danh mục sticker thì panel mở ở tab Sticker và bấm là gửi sticker', () => {
        const sticker = { id: 'hi', image_url: '/s/hi.png', pack_id: null, label: 'Chào' };
        act(() => widgetStore.setMessagingPolicy({ recallWindowSeconds: 300, stickers: [sticker] }));
        const { onSendSticker } = renderComposer();

        fireEvent.click(screen.getByRole('button', { name: 'Stickers and emoji' }));
        expect(screen.getByRole('tab', { name: 'Stickers' })).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Chào' }));

        expect(onSendSticker).toHaveBeenCalledWith(sticker);
        expect(screen.queryByTestId('sticker-panel')).not.toBeInTheDocument();
    });

    it('không có sticker lẫn emoji thì không hiện nút sticker', () => {
        renderComposer();
        expect(screen.queryByRole('button', { name: 'Stickers and emoji' })).not.toBeInTheDocument();
    });

    it('giữ nội dung đang gõ qua lần dựng lại ô nhập', () => {
        const first = render(
            <ChatInputWrap onSendMessage={vi.fn()} onSendFiles={vi.fn()} onSendSticker={vi.fn()} />,
        );
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'đang gõ dở' } });
        first.unmount();

        expect(readComposerDraft()).toBe('đang gõ dở');
        renderComposer();
        expect(screen.getByRole('textbox')).toHaveValue('đang gõ dở');
    });

    it('bộ nhớ trình duyệt bị chặn thì ô nhập vẫn chạy', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        renderComposer();

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'vẫn gõ được' } });
        expect(screen.getByRole('textbox')).toHaveValue('vẫn gõ được');
    });
});
