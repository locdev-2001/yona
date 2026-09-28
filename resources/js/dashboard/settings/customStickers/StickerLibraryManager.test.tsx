import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    keywords: [],
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
        updateSticker: vi.fn(),
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
        const browserConfirm = vi.spyOn(window, 'confirm');
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        fireEvent.click(screen.getAllByRole('button', { name: 'Đưa xuống sau' })[0]);
        await waitFor(() => expect(api.reorderStickers).toHaveBeenCalledWith(3, [2, 1]));

        fireEvent.click(screen.getAllByRole('button', { name: 'Xoá sticker' })[0]);
        const dialog = screen.getByRole('alertdialog');
        expect(dialog).toHaveTextContent('Xoá sticker này khỏi bộ?');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(api.deleteSticker).not.toHaveBeenCalled();

        fireEvent.click(screen.getAllByRole('button', { name: 'Xoá sticker' })[0]);
        fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xoá sticker' }));
        await waitFor(() => expect(api.deleteSticker).toHaveBeenCalledWith(3, 2));
        expect(browserConfirm).not.toHaveBeenCalled();
        browserConfirm.mockRestore();
    });

    it('xoá bộ qua hộp xác nhận, Esc thì đóng mà không xoá', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        fireEvent.click(screen.getByRole('button', { name: 'Xoá bộ' }));
        expect(screen.getByRole('alertdialog')).toHaveTextContent('cùng mọi sticker trong bộ');
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(api.deletePack).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Xoá bộ' }));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xoá bộ' }));
        await waitFor(() => expect(api.deletePack).toHaveBeenCalledWith(3));
    });

    it('sửa nhãn và từ khoá của một sticker, lưu qua PATCH rồi hiện chip từ khoá mới', async () => {
        const updateSticker = vi
            .fn()
            .mockResolvedValue(sticker({ label: 'Cười lớn', keywords: ['haha', 'hihi'] }));
        const api = fakeApi({ updateSticker });
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();
        expect(screen.getByText('Chưa có từ khoá')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Sửa nhãn và từ khoá' }));
        fireEvent.change(screen.getByLabelText('Nhãn'), { target: { value: '  Cười lớn ' } });
        fireEvent.change(screen.getByLabelText('Từ khoá'), { target: { value: ' haha, hihi ,, HAHA ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

        await waitFor(() =>
            expect(updateSticker).toHaveBeenCalledWith(3, 11, { label: 'Cười lớn', keywords: ['haha', 'hihi'] }),
        );
        expect(await screen.findByText('hihi')).toBeTruthy();
        expect(screen.getByText('Cười lớn')).toBeTruthy();
        expect(screen.queryByLabelText('Nhãn')).toBeNull();
    });

    it('xoá trắng nhãn thì gửi null; máy chủ từ chối thì giữ form và báo lỗi', async () => {
        const rejection = new ApiError(422, { message: 'Từ khoá quá dài.' });
        const updateSticker = vi.fn().mockRejectedValue(rejection);
        render(<StickerLibraryManager api={fakeApi({ updateSticker })} />);
        await openFirstPack();

        fireEvent.click(screen.getByRole('button', { name: 'Sửa nhãn và từ khoá' }));
        fireEvent.change(screen.getByLabelText('Nhãn'), { target: { value: '   ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

        await waitFor(() => expect(updateSticker).toHaveBeenCalledWith(3, 11, { label: null, keywords: [] }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Từ khoá quá dài.');
        expect(screen.getByLabelText('Nhãn')).toBeTruthy();
    });

    it('huỷ sửa thì không gọi máy chủ', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        fireEvent.click(screen.getByRole('button', { name: 'Sửa nhãn và từ khoá' }));
        fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));

        expect(screen.queryByLabelText('Nhãn')).toBeNull();
        expect(api.updateSticker).not.toHaveBeenCalled();
    });

    it('từ khoá của lượt tải áp cho mọi tệp trong lượt đó', async () => {
        const api = fakeApi({ uploadSticker: vi.fn().mockResolvedValue(sticker({ id: 12 })) });
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        fireEvent.change(screen.getByLabelText('Từ khoá cho các tệp sắp tải (tuỳ chọn)'), {
            target: { value: 'chào, hello' },
        });
        const first = new File(['{}'], 'a.json', { type: 'application/json' });
        const second = new File(['{}'], 'b.json', { type: 'application/json' });
        fireEvent.change(screen.getByTestId('sticker-file-input'), { target: { files: [first, second] } });

        await waitFor(() => expect(api.uploadSticker).toHaveBeenCalledTimes(2));
        expect(api.uploadSticker).toHaveBeenNthCalledWith(1, 3, first, ['chào', 'hello']);
        expect(api.uploadSticker).toHaveBeenNthCalledWith(2, 3, second, ['chào', 'hello']);
    });
});
