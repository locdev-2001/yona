import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { widgetStore } from '../store/widgetStore';
import type { ChannelConfig, WidgetContact } from '../types';
import ChatInputWrap from './ChatInputWrap';
import { readComposerDraft } from './composer/composerStorage';

const imageFile = (name: string) => new File(['x'], name, { type: 'image/png' });

const renderComposer = () => {
    const handlers = { onSendMessage: vi.fn(), onSendFiles: vi.fn(), onSendSticker: vi.fn() };
    render(<ChatInputWrap {...handlers} />);
    return handlers;
};

const sendButton = () => screen.getByRole('button', { name: 'Send' });

// Cấu hình hộp thư: cờ tính năng của kênh + giới hạn cỡ tệp (MB).
const configureInbox = (enabledFeatures: string[], maximumFileUploadSizeMb = 40) =>
    act(() =>
        widgetStore.setChannelConfig(
            { enabledFeatures, widgetColor: '#1b6fcc' } as unknown as ChannelConfig,
            { MAXIMUM_FILE_UPLOAD_SIZE: maximumFileUploadSizeMb },
            {} as WidgetContact,
        ),
    );

// jsdom không dàn trang: giả chiều cao nội dung của ô nhập như trình duyệt đo.
const stubContentHeight = (textarea: HTMLElement, contentHeight: number) =>
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, get: () => contentHeight });

beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.URL.createObjectURL = vi.fn(() => 'blob:preview');
    window.URL.revokeObjectURL = vi.fn();
    act(() => {
        widgetStore.setAppConfig({ enableFileUpload: true, enableEmojiPicker: true });
        widgetStore.setMessagingPolicy({ recallWindowSeconds: 300, stickers: [] });
    });
    configureInbox(['attachments']);
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

    it('chỉ có danh mục sticker thì nút mở panel ở tab Sticker và bấm là gửi sticker', () => {
        const sticker = { id: 'hi', image_url: '/s/hi.png', pack_id: null, label: 'Chào' };
        act(() => widgetStore.setMessagingPolicy({ recallWindowSeconds: 300, stickers: [sticker] }));
        const { onSendSticker } = renderComposer();

        fireEvent.click(screen.getByRole('button', { name: 'Stickers' }));
        expect(screen.getByRole('tab', { name: 'Stickers' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.queryByRole('tab', { name: 'Emoji' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Chào' }));

        expect(onSendSticker).toHaveBeenCalledWith(sticker);
        expect(screen.queryByTestId('sticker-panel')).not.toBeInTheDocument();
    });

    it('bật bộ chọn biểu tượng cảm xúc mà chưa có sticker: panel Emoji + Gần đây nằm trên ô nhập, không nhắc sticker', () => {
        configureInbox(['attachments', 'emoji_picker']);
        renderComposer();

        expect(screen.queryByRole('button', { name: /sticker/i })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Emoji' }));

        const panel = screen.getByTestId('sticker-panel');
        expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toStrictEqual(['Emoji', 'Recent']);
        expect(panel.compareDocumentPosition(screen.getByRole('textbox')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        // Lọc lưới trước khi truy vấn: tính accessible name của cả ~1850 nút emoji trên
        // jsdom mất vài giây và làm test vượt trần khi chạy chung cả bộ.
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'grinning' } });
        fireEvent.click(screen.getAllByRole('button', { name: 'grinning face' })[0]);
        expect(screen.getByRole('textbox')).toHaveValue('😀');
    });

    it('không có sticker lẫn emoji thì không hiện nút mở panel', () => {
        renderComposer();
        expect(screen.queryByRole('button', { name: /sticker|emoji/i })).not.toBeInTheDocument();
    });

    it('tệp quá lớn hiện khối lỗi đỏ có đơn vị MB thay cho banner, "Thử lại" mở lại bộ chọn tệp', () => {
        configureInbox(['attachments'], 1);
        const showBanner = vi.spyOn(widgetStore, 'showBanner');
        renderComposer();
        const bigFile = new File([new Uint8Array(2 * 1024 * 1024)], 'bao-gia.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByTestId('composer-file-input');
        const openPicker = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

        fireEvent.change(fileInput, { target: { files: [bigFile] } });

        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Could not send the file');
        expect(alert).toHaveTextContent('File is over 1 MB');
        expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
        expect(showBanner).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(openPicker).toHaveBeenCalledTimes(1);
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

    it('ô rỗng và một dòng: cao đúng nội dung, không cho cuộn (không hiện ▲▼)', () => {
        renderComposer();
        const input = screen.getByRole('textbox');
        stubContentHeight(input, 36);

        fireEvent.change(input, { target: { value: 'a' } });
        expect(input.style.height).toBe('36px');
        expect(input.style.overflowY).toBe('hidden');

        fireEvent.change(input, { target: { value: '' } });
        expect(parseFloat(input.style.height)).toBeGreaterThanOrEqual(input.scrollHeight);
        expect(input.style.overflowY).toBe('hidden');
    });

    it('nhiều dòng giãn tới trần 120px rồi mới cho cuộn', () => {
        renderComposer();
        const input = screen.getByRole('textbox');

        stubContentHeight(input, 108);
        fireEvent.change(input, { target: { value: 'một\nhai\nba\nbốn\nnăm' } });
        expect(input.style.height).toBe('108px');
        expect(input.style.overflowY).toBe('hidden');

        stubContentHeight(input, 180);
        fireEvent.change(input, { target: { value: 'một\nhai\nba\nbốn\nnăm\nsáu\nbảy\ntám\nchín' } });
        expect(input.style.height).toBe('120px');
        expect(input.style.overflowY).toBe('auto');
    });
});
