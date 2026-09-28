import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetContact, WidgetSticker } from '../types';
import ChatInputWrap from './ChatInputWrap';
import { readRecentReactions } from './composer/composerStorage';

const HAHA: WidgetSticker = { id: 'yona:1', image_url: '/s/haha.webp', pack_id: 'yona:3', label: 'Cười', keywords: ['haha'] };
const THANKS: WidgetSticker = { id: 'yona:2', image_url: '/s/thanks.webp', pack_id: 'yona:3', label: 'Cảm ơn', keywords: [] };
const LEGACY: WidgetSticker = { id: 'zalo:9', image_url: '/s/legacy.webp', pack_id: null, label: 'Hahaha' };

const renderComposer = () => {
    const handlers = { onSendMessage: vi.fn(), onSendFiles: vi.fn(), onSendSticker: vi.fn() };
    // Khung chat đóng khi Esc lan tới tầng view; bắt lại ở đây để biết phím có lọt ra không.
    const outerKeyDown = vi.fn();
    render(
        <div onKeyDown={outerKeyDown}>
            <ChatInputWrap {...handlers} />
        </div>,
    );
    return { ...handlers, outerKeyDown };
};

const input = () => screen.getByRole('textbox');
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const suggestionsRow = () => screen.queryByRole('toolbar', { name: 'Suggested stickers' });

beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    act(() => {
        widgetStore.setAppConfig({ enableFileUpload: true, enableEmojiPicker: true });
        widgetStore.setMessagingPolicy({ recallWindowSeconds: 300, stickers: [HAHA, THANKS, LEGACY] });
        widgetStore.setChannelConfig(
            { enabledFeatures: ['attachments'], widgetColor: '#1b6fcc' } as unknown as ChannelConfig,
            { MAXIMUM_FILE_UPLOAD_SIZE: 40 },
            {} as WidgetContact,
        );
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('ChatInputWrap — sticker gợi ý khi gõ', () => {
    it('lọc tại chỗ theo từ khoá và nhãn, bỏ dấu, không gọi mạng', () => {
        renderComposer();
        type('Cam on');

        const row = suggestionsRow()!;
        expect(within(row).getByRole('button', { name: 'Cảm ơn' }).querySelector('img')).toHaveAttribute(
            'src',
            '/s/thanks.webp',
        );
        expect(within(row).queryByRole('button', { name: 'Cười' })).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('từ khoá khớp đúng lên trước; sticker cấu hình cũ chưa có từ khoá vẫn khớp theo nhãn', () => {
        renderComposer();
        type('HAHA');

        const names = within(suggestionsRow()!)
            .getAllByRole('button')
            .map(button => button.getAttribute('aria-label'));
        expect(names).toEqual(['Cười', 'Hahaha', 'Hide suggested stickers']);
    });

    it('gõ tiếp không còn khớp, hoặc dưới 2 ký tự, thì ẩn', () => {
        renderComposer();
        type('haha');
        expect(suggestionsRow()).not.toBeNull();

        type('hahaz');
        expect(suggestionsRow()).toBeNull();
        type('h');
        expect(suggestionsRow()).toBeNull();
    });

    it('bấm sticker gợi ý thì gửi qua đường gửi sticker, dọn ô nhập và ghi vào Gần đây', () => {
        const { onSendSticker, onSendMessage } = renderComposer();
        type('haha');

        fireEvent.click(within(suggestionsRow()!).getByRole('button', { name: 'Cười' }));

        expect(onSendSticker).toHaveBeenCalledWith(HAHA);
        expect(onSendMessage).not.toHaveBeenCalled();
        expect(input()).toHaveValue('');
        expect(suggestionsRow()).toBeNull();
        expect(readRecentReactions()[0]).toEqual({ kind: 'sticker', id: HAHA.id, imageUrl: HAHA.image_url });
    });

    it('Enter trong ô nhập vẫn gửi tin chữ khi hàng gợi ý đang hiện', () => {
        const { onSendSticker, onSendMessage } = renderComposer();
        type('haha');
        expect(suggestionsRow()).not.toBeNull();

        fireEvent.keyDown(input(), { key: 'Enter' });

        expect(onSendMessage).toHaveBeenCalledWith('haha');
        expect(onSendSticker).not.toHaveBeenCalled();
    });

    it('bàn phím trong hàng: mũi tên đổi sticker, Enter gửi đúng sticker đang chọn', () => {
        const { onSendSticker } = renderComposer();
        type('ha');
        const [first, second] = within(suggestionsRow()!).getAllByRole('button');

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowRight' });
        expect(second).toHaveFocus();
        fireEvent.keyDown(second, { key: 'Enter' });

        expect(onSendSticker).toHaveBeenCalledTimes(1);
        expect(onSendSticker).toHaveBeenCalledWith(LEGACY);
    });

    it('Esc trong ô nhập ẩn gợi ý mà không đóng khung chat, chữ còn nguyên', () => {
        const { outerKeyDown } = renderComposer();
        type('haha');

        fireEvent.keyDown(input(), { key: 'Escape' });

        expect(suggestionsRow()).toBeNull();
        expect(input()).toHaveValue('haha');
        expect(outerKeyDown).not.toHaveBeenCalled();
    });

    it('nút đóng ẩn gợi ý của cụm này; gõ cụm khác thì hiện lại', () => {
        renderComposer();
        type('haha');
        fireEvent.click(screen.getByRole('button', { name: 'Hide suggested stickers' }));
        expect(suggestionsRow()).toBeNull();

        type('cảm');
        expect(suggestionsRow()).not.toBeNull();
    });

    it('đang có ảnh chờ gửi thì chữ là chú thích, không gợi ý', () => {
        window.URL.createObjectURL = vi.fn(() => 'blob:preview');
        window.URL.revokeObjectURL = vi.fn();
        renderComposer();
        fireEvent.change(screen.getByTestId('composer-image-input'), {
            target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
        });

        type('haha');

        expect(suggestionsRow()).toBeNull();
    });

    it('kênh không có danh mục sticker thì không gợi ý', () => {
        act(() => widgetStore.setMessagingPolicy({ recallWindowSeconds: 300, stickers: [] }));
        renderComposer();
        type('haha');

        expect(suggestionsRow()).toBeNull();
    });
});
