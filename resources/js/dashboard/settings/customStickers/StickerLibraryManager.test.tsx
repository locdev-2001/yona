import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';
import { setLocale } from '../../../i18n';
import StickerLibraryManager, { PROCESSING_POLL_INTERVAL_MS } from './StickerLibraryManager';
import type { StickerLibraryApi } from './stickerLibraryApi';
import type { LibrarySticker, LibraryStickerPackDetail } from './types';

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));
afterEach(() => vi.useRealTimers());

const sticker = (overrides: Partial<LibrarySticker> = {}): LibrarySticker => ({
    id: 11,
    label: 'Chó vẫy',
    status: 'ready',
    failure_message: null,
    position: 0,
    width: 512,
    height: 512,
    poster_url: '/stickers/poster.webp',
    static_url: '/stickers/static.png',
    animation_url: '/stickers/anim.json',
    ...overrides,
});

const packDetail = (overrides: Partial<LibraryStickerPackDetail> = {}): LibraryStickerPackDetail => ({
    id: 3,
    name: 'Chó vui',
    published: false,
    published_at: null,
    stickers_count: 1,
    cover_url: '/stickers/poster.webp',
    stickers: [sticker()],
    ...overrides,
});

function fakeApi(overrides: Partial<StickerLibraryApi> = {}): StickerLibraryApi {
    const pack = packDetail();

    return {
        listPacks: vi.fn().mockResolvedValue({ payload: [pack], meta: { max_upload_kb: 100, accepted_extensions: ['json', 'tgs'] } }),
        createPack: vi.fn(),
        getPack: vi.fn().mockResolvedValue(pack),
        renamePack: vi.fn(),
        setPublished: vi.fn().mockResolvedValue({ ...pack, published: true }),
        deletePack: vi.fn(),
        uploadSticker: vi.fn(),
        reorderStickers: vi.fn(),
        deleteSticker: vi.fn(),
        ...overrides,
    };
}

async function openFirstPack() {
    fireEvent.click(await screen.findByRole('button', { name: /Chó vui/ }));
    await screen.findByRole('button', { name: 'Tải sticker lên' });
}

describe('StickerLibraryManager', () => {
    it('liệt kê bộ, mở bộ và xuất bản', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);

        await openFirstPack();
        expect(screen.getByText('Sẵn sàng')).toBeTruthy();
        expect(screen.getByText(/tối đa 100 KB/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Xuất bản' }));
        await waitFor(() => expect(api.setPublished).toHaveBeenCalledWith(3, true));
        expect(await screen.findByRole('button', { name: 'Gỡ xuất bản' })).toBeTruthy();
    });

    it('tạo bộ mới từ ô nhập tên', async () => {
        const api = fakeApi({ createPack: vi.fn().mockResolvedValue(packDetail({ id: 9, name: 'Mèo', stickers: [] })) });
        render(<StickerLibraryManager api={api} />);

        fireEvent.change(await screen.findByLabelText('Tên bộ mới'), { target: { value: '  Mèo ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Tạo bộ' }));

        await waitFor(() => expect(api.createPack).toHaveBeenCalledWith('Mèo'));
        expect(await screen.findByText('Bộ này chưa có sticker nào.')).toBeTruthy();
    });

    it('tải nhiều tệp lần lượt, tệp bị từ chối hiện đúng câu lỗi kèm tên tệp', async () => {
        const rejection = new ApiError(422, { errors: { file: ['Sticker không được dùng expression.'] } });
        const api = fakeApi({
            uploadSticker: vi.fn().mockResolvedValueOnce(sticker({ id: 12 })).mockRejectedValueOnce(rejection),
        });
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        const good = new File(['{}'], 'tot.json', { type: 'application/json' });
        const bad = new File(['{}'], 'xau.json', { type: 'application/json' });
        fireEvent.change(screen.getByTestId('sticker-file-input'), { target: { files: [good, bad] } });

        expect(await screen.findByText('xau.json: Sticker không được dùng expression.')).toBeTruthy();
        expect(api.uploadSticker).toHaveBeenNthCalledWith(1, 3, good);
        expect(api.uploadSticker).toHaveBeenNthCalledWith(2, 3, bad);
    });

    it('hiện lỗi i18n của sticker hỏng', async () => {
        const failed = sticker({ status: 'failed', failure_message: 'Sticker quá phức tạp.', poster_url: null });
        render(<StickerLibraryManager api={fakeApi({ getPack: vi.fn().mockResolvedValue(packDetail({ stickers: [failed] })) })} />);
        await openFirstPack();

        expect(screen.getByText('Lỗi')).toBeTruthy();
        expect(screen.getByText('Sticker quá phức tạp.')).toBeTruthy();
    });

    it('tự làm mới khi còn sticker đang xử lý', async () => {
        const processing = packDetail({ stickers: [sticker({ status: 'processing', poster_url: null })] });
        const getPack = vi.fn().mockResolvedValueOnce(processing).mockResolvedValue(packDetail());
        const api = fakeApi({ getPack });
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();
        expect(screen.getByText('Đang xử lý')).toBeTruthy();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(PROCESSING_POLL_INTERVAL_MS);
        });

        expect(await screen.findByText('Sẵn sàng')).toBeTruthy();
        expect(getPack).toHaveBeenCalledTimes(2);
    });

    it('sắp xếp và xoá sticker', async () => {
        const two = packDetail({ stickers: [sticker({ id: 1 }), sticker({ id: 2 })] });
        const api = fakeApi({
            getPack: vi.fn().mockResolvedValue(two),
            reorderStickers: vi.fn().mockResolvedValue(packDetail({ stickers: [sticker({ id: 2 }), sticker({ id: 1 })] })),
        });
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        fireEvent.click(screen.getAllByRole('button', { name: 'Đưa xuống sau' })[0]);
        await waitFor(() => expect(api.reorderStickers).toHaveBeenCalledWith(3, [2, 1]));

        fireEvent.click(screen.getAllByRole('button', { name: 'Xoá sticker' })[0]);
        await waitFor(() => expect(api.deleteSticker).toHaveBeenCalledWith(3, 2));
        confirmSpy.mockRestore();
    });
});
