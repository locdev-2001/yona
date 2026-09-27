import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';
import type { StickerBrowseParams, StickerBrowseResult, StickerItem } from 'dashboard/conversation/stickerApi';
import { t } from '../../../i18n';
import StickerPicker from './StickerPicker';

const HELLO: StickerItem = { id: '98930', image_url: 'https://cdn.zalo.test/98930.webp', pack_id: '61900', label: null };
const THANKS: StickerItem = { id: '50626', image_url: 'https://cdn.zalo.test/50626.webp', pack_id: '12658', label: 'Cảm ơn' };

function browsed(overrides: Partial<StickerBrowseResult> = {}): StickerBrowseResult {
    return {
        source: 'recent',
        query: null,
        pack_id: null,
        stickers: [HELLO],
        packs: [{ id: '61900', cover_url: HELLO.image_url }],
        ...overrides,
    };
}

function renderPicker(loadStickers: (params: StickerBrowseParams) => Promise<StickerBrowseResult>) {
    const onSelect = vi.fn();
    render(<StickerPicker loadStickers={loadStickers} onSelect={onSelect} />);

    return { onSelect };
}

const searchBox = () => screen.getByRole('searchbox');
const stickerButtons = () => Array.from(screen.getByTestId('sticker-picker').querySelectorAll('.grid > button'));

afterEach(() => {
    vi.useRealTimers();
});

describe('StickerPicker', () => {
    it('mở ra thì tải mặc định: lưới "Gần đây" và tab bộ sticker', async () => {
        const loadStickers = vi.fn().mockResolvedValue(browsed());
        renderPicker(loadStickers);

        expect(loadStickers).toHaveBeenCalledWith({});
        await waitFor(() => expect(stickerButtons()).toHaveLength(1));
        expect(screen.getByRole('button', { name: t('CONVERSATION.STICKER_PICKER.RECENT') }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: t('CONVERSATION.STICKER_PICKER.PACK') }).querySelector('img')?.getAttribute('src')).toBe(
            HELLO.image_url,
        );
    });

    it('sticker kho Yona trong lưới chỉ là ảnh poster tĩnh, không phát bản động', async () => {
        const yonaSticker: StickerItem = {
            id: 'yona:12',
            image_url: 'https://yona.test/storage/stickers/ab/poster.webp',
            pack_id: 'yona:3',
            label: 'Mèo vẫy',
        };
        renderPicker(vi.fn().mockResolvedValue(browsed({ stickers: [yonaSticker], packs: [] })));

        await waitFor(() => expect(stickerButtons()).toHaveLength(1));
        expect(stickerButtons()[0].querySelector('img')?.getAttribute('src')).toBe(yonaSticker.image_url);
        expect(screen.getByTestId('sticker-picker').querySelector('[data-sticker-player], lottie-player')).toBeNull();
    });

    it('gõ từ khoá thì chờ ngừng gõ 400ms rồi mới tìm, đúng một lần', async () => {
        vi.useFakeTimers();
        const loadStickers = vi.fn().mockResolvedValue(browsed({ source: 'search', query: 'cảm ơn', stickers: [THANKS], packs: [] }));
        renderPicker(loadStickers);
        loadStickers.mockClear();

        fireEvent.change(searchBox(), { target: { value: 'cả' } });
        act(() => vi.advanceTimersByTime(200));
        fireEvent.change(searchBox(), { target: { value: 'cảm ơn' } });
        act(() => vi.advanceTimersByTime(399));
        expect(loadStickers).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(1));
        expect(loadStickers).toHaveBeenCalledTimes(1);
        expect(loadStickers).toHaveBeenCalledWith({ q: 'cảm ơn' });
    });

    it('một ký tự thì chưa tìm; xoá trắng ô thì quay về mặc định', async () => {
        vi.useFakeTimers();
        const loadStickers = vi.fn().mockResolvedValue(browsed());
        renderPicker(loadStickers);
        loadStickers.mockClear();

        fireEvent.change(searchBox(), { target: { value: 'a' } });
        act(() => vi.advanceTimersByTime(1000));
        expect(loadStickers).not.toHaveBeenCalled();

        fireEvent.change(searchBox(), { target: { value: '' } });
        expect(loadStickers).toHaveBeenCalledWith({});
    });

    it('bấm từ khoá gợi ý thì điền vào ô và tìm ngay', async () => {
        const loadStickers = vi.fn().mockResolvedValue(browsed());
        renderPicker(loadStickers);
        const [firstKeyword] = t('CONVERSATION.STICKER_PICKER.SUGGESTED_KEYWORDS').split(',');

        fireEvent.click(screen.getByRole('button', { name: firstKeyword }));

        expect(loadStickers).toHaveBeenLastCalledWith({ q: firstKeyword });
        expect((searchBox() as HTMLInputElement).value).toBe(firstKeyword);
    });

    it('bấm tab bộ thì tải cả bộ', async () => {
        const loadStickers = vi.fn().mockResolvedValue(browsed());
        renderPicker(loadStickers);
        const packTab = await screen.findByRole('button', { name: t('CONVERSATION.STICKER_PICKER.PACK') });

        fireEvent.click(packTab);

        expect(loadStickers).toHaveBeenLastCalledWith({ pack: '61900' });
    });

    it('không có kết quả thì nói rõ từ khoá; lỗi thì hiện câu máy chủ và "Thử lại" gọi lại', async () => {
        const loadStickers = vi
            .fn()
            .mockResolvedValueOnce(browsed())
            .mockResolvedValueOnce(browsed({ source: 'search', query: 'xyzxyz', stickers: [], packs: [] }))
            .mockRejectedValueOnce(new ApiError(422, { error: 'Phiên Zalo đã hết.' }))
            .mockResolvedValueOnce(browsed({ source: 'search', query: 'haha', stickers: [THANKS], packs: [] }));
        renderPicker(loadStickers);
        await waitFor(() => expect(stickerButtons()).toHaveLength(1));

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.STICKER_PICKER.SUGGESTED_KEYWORDS').split(',')[0] }));
        expect(await screen.findByText(t('CONVERSATION.STICKER_PICKER.NO_RESULTS', { query: 'xyzxyz' }))).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.STICKER_PICKER.SUGGESTED_KEYWORDS').split(',')[1] }));
        expect(await screen.findByText('Phiên Zalo đã hết.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.STICKER_PICKER.RETRY') }));
        await waitFor(() => expect(stickerButtons()).toHaveLength(1));
        expect(loadStickers).toHaveBeenCalledTimes(4);
        expect(loadStickers.mock.calls[3]).toEqual(loadStickers.mock.calls[2]);
    });

    it('bấm một sticker thì trả đúng mục đó', async () => {
        const loadStickers = vi.fn().mockResolvedValue(browsed({ stickers: [HELLO, THANKS] }));
        const { onSelect } = renderPicker(loadStickers);

        fireEvent.click(await screen.findByRole('button', { name: 'Cảm ơn' }));

        expect(onSelect).toHaveBeenCalledWith(THANKS);
    });

    it('response đến muộn của lượt cũ bị bỏ, không đè lên lượt mới', async () => {
        let resolveRecent: (value: StickerBrowseResult) => void = () => undefined;
        const loadStickers = vi
            .fn()
            .mockImplementationOnce(() => new Promise<StickerBrowseResult>(resolve => (resolveRecent = resolve)))
            .mockResolvedValueOnce(browsed({ source: 'search', query: 'ok', stickers: [THANKS], packs: [] }));
        renderPicker(loadStickers);

        fireEvent.click(screen.getByRole('button', { name: 'ok' }));
        await screen.findByRole('button', { name: 'Cảm ơn' });

        await act(async () => resolveRecent(browsed({ stickers: [HELLO] })));

        expect(screen.getByRole('button', { name: 'Cảm ơn' })).toBeTruthy();
        expect(stickerButtons()).toHaveLength(1);
    });
});
