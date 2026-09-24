import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { canPickSticker } from '../stickerApi';
import type { StickerBrowseResult } from '../stickerApi';
import { t } from '../../../i18n';
import ReplyBottomPanel from './ReplyBottomPanel';
import type { ReplyStickerPicker } from './ReplyBottomPanel';

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

const RECENT: StickerBrowseResult = {
    source: 'recent',
    query: null,
    pack_id: null,
    stickers: [{ id: '98930', image_url: 'https://cdn.zalo.test/98930.webp', pack_id: '61900', label: 'Chào' }],
    packs: [],
};

function renderPanel({
    stickerPicker = null,
    isEditorDisabled = false,
}: {
    stickerPicker?: ReplyStickerPicker | null;
    isEditorDisabled?: boolean;
} = {}) {
    render(
        <ReplyBottomPanel
            isNote={false}
            isOnPrivateNote={false}
            isEditorDisabled={isEditorDisabled}
            showAudioRecorder={false}
            isSendDisabled={false}
            sendButtonText="Gửi"
            sendWithSignature={false}
            onSend={vi.fn()}
            onFileUpload={vi.fn()}
            onToggleSignature={vi.fn()}
            onSelectEmoji={vi.fn()}
            stickerPicker={stickerPicker}
        />,
    );
}

const stickerButton = () => screen.queryByTitle(t('CONVERSATION.REPLYBOX.TIP_STICKER_ICON'));

describe('ReplyBottomPanel — nút sticker', () => {
    it('không có bảng chọn (kênh không hỗ trợ / Lưu ý riêng) thì không có nút', () => {
        renderPanel();

        expect(stickerButton()).toBeNull();
    });

    it('khung soạn đang khoá thì không có nút dù kênh hỗ trợ', () => {
        renderPanel({ stickerPicker: { loadStickers: vi.fn(), onSelect: vi.fn() }, isEditorDisabled: true });

        expect(stickerButton()).toBeNull();
    });

    it('nút emoji không còn dùng icon giống sticker', () => {
        renderPanel({ stickerPicker: { loadStickers: vi.fn().mockResolvedValue(RECENT), onSelect: vi.fn() } });

        const emojiButton = screen.getByTitle(t('CONVERSATION.REPLYBOX.TIP_EMOJI_ICON'));

        expect(emojiButton.querySelector('.i-ph-smiley')).not.toBeNull();
        expect(stickerButton()?.querySelector('.i-ph-sticker')).not.toBeNull();
    });

    it('bấm nút mở bảng chọn; chọn sticker thì đóng bảng và trả đúng sticker', async () => {
        const onSelect = vi.fn();
        const loadStickers = vi.fn().mockResolvedValue(RECENT);
        renderPanel({ stickerPicker: { loadStickers, onSelect } });

        fireEvent.click(stickerButton()!);

        expect(await screen.findByTestId('sticker-picker')).toBeTruthy();
        expect(loadStickers).toHaveBeenCalledWith({});

        fireEvent.click(await screen.findByRole('button', { name: 'Chào' }));

        expect(onSelect).toHaveBeenCalledWith(RECENT.stickers[0]);
        await waitFor(() => expect(screen.queryByTestId('sticker-picker')).toBeNull());
    });
});

describe('canPickSticker', () => {
    const zalo = { capabilities: ['outbound_sticker'] };

    it.each([
        [zalo, false, false, true],
        [zalo, true, false, false],
        [zalo, false, true, false],
        [{ capabilities: ['outbound_text'] }, false, false, false],
        [null, false, false, false],
    ])('%o · Lưu ý riêng %s · khoá %s → %s', (inbox, isOnPrivateNote, isEditorDisabled, expected) => {
        expect(canPickSticker(inbox, { isOnPrivateNote, isEditorDisabled })).toBe(expected);
    });
});
