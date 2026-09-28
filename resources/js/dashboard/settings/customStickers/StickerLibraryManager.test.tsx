import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';
import { setLocale } from '../../../i18n';
import StickerLibraryManager, { PROCESSING_POLL_INTERVAL_MS } from './StickerLibraryManager';
import type { StickerLibraryApi } from './stickerLibraryApi';
import { decodeStickerSource } from './stickerSourceImage';
import { prepareStickerUpload } from './stickerUploadFile';
import type { LibrarySticker, LibraryStickerPackDetail } from './types';

vi.mock('./stickerSourceImage', async importOriginal => ({
    ...(await importOriginal<typeof import('./stickerSourceImage')>()),
    decodeStickerSource: vi.fn(),
}));
vi.mock('./stickerUploadFile', async importOriginal => ({
    ...(await importOriginal<typeof import('./stickerUploadFile')>()),
    prepareStickerUpload: vi.fn(async (file: File) => file),
}));

// Ảnh 20×20: chấm đỏ giữa nền trắng.
function dotOnWhite() {
    const side = 20;
    const rgba = new Uint8ClampedArray(side * side * 4);
    for (let index = 0; index < side * side; index++) {
        const x = index % side;
        const y = Math.floor(index / side);
        const inDot = x >= 6 && x < 14 && y >= 6 && y < 14;
        rgba.set(inDot ? [230, 20, 20, 255] : [255, 255, 255, 255], index * 4);
    }

    return { width: side, height: side, rgba };
}

beforeAll(() => {
    setLocale('vi');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterAll(() => setLocale('en'));
beforeEach(() => vi.mocked(decodeStickerSource).mockResolvedValue({ pixels: dotOnWhite(), animated: false }));
afterEach(() => vi.useRealTimers());

const sticker = (overrides: Partial<LibrarySticker> = {}): LibrarySticker => ({
    id: 11,
    label: 'Chó vẫy',
    keywords: [],
    status: 'ready',
    failure_message: null,
    position: 0,
    width: 64,
    height: 64,
    frames: 1,
    image_url: '/stickers/sticker.webp',
    static_url: '/stickers/static.png',
    ...overrides,
});

const packDetail = (overrides: Partial<LibraryStickerPackDetail> = {}): LibraryStickerPackDetail => ({
    id: 3,
    name: 'Chó vui',
    published: false,
    published_at: null,
    stickers_count: 1,
    cover_url: '/stickers/sticker.webp',
    stickers: [sticker()],
    ...overrides,
});

function fakeApi(overrides: Partial<StickerLibraryApi> = {}): StickerLibraryApi {
    const pack = packDetail();

    return {
        listPacks: vi.fn().mockResolvedValue({ payload: [pack], meta: { max_upload_kb: 10240, accepted_extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'], image_size: 64 } }),
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
    await screen.findByRole('button', { name: 'Thêm sticker' });
}

describe('StickerLibraryManager', () => {
    it('liệt kê bộ, mở bộ và xuất bản', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);

        await openFirstPack();
        expect(screen.getByText('Sẵn sàng')).toBeTruthy();
        expect(screen.getByText(/tối đa 10 MB\. Sticker tạo ra luôn là 64×64/)).toBeTruthy();
        expect(screen.getByRole('img', { name: 'Chó vẫy' }).getAttribute('src')).toBe('/stickers/sticker.webp');

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

    it('chọn nhiều ảnh thì mở trình chỉnh lần lượt từng ảnh; tệp sai loại bị từ chối kèm tên tệp', async () => {
        const uploadSticker = vi.fn().mockResolvedValue(sticker({ id: 12, status: 'processing', image_url: null }));
        const api = fakeApi({ uploadSticker });
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        const first = new File(['a'], 'meo.png', { type: 'image/png' });
        const notImage = new File(['{}'], 'cu.json', { type: 'application/json' });
        const second = new File(['b'], 'cho.gif', { type: 'image/gif' });
        fireEvent.change(screen.getByTestId('sticker-file-input'), { target: { files: [first, notImage, second] } });

        expect(await screen.findByText('cu.json: chỉ nhận ảnh PNG, JPG, WebP hoặc GIF.')).toBeTruthy();
        const editor = await screen.findByRole('dialog');
        expect(editor).toHaveTextContent('Ảnh 1/2 · meo.png');

        fireEvent.change(await within(editor).findByLabelText('Nhãn'), { target: { value: 'Mèo' } });
        await waitFor(() => expect(within(editor).getByRole('button', { name: 'Lưu sticker' })).toBeEnabled());
        fireEvent.click(within(editor).getByRole('button', { name: 'Lưu sticker' }));

        await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Ảnh 2/2 · cho.gif'));
        expect(uploadSticker).toHaveBeenCalledTimes(1);
        expect(uploadSticker).toHaveBeenCalledWith(3, first, {
            edit: expect.objectContaining({ removeBackground: true, tolerance: 20, feather: 0, edits: [] }),
            label: 'Mèo',
            keywords: [],
        });
        await waitFor(() => expect(api.getPack).toHaveBeenCalledTimes(2));

        fireEvent.click(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Bỏ qua ảnh này' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(uploadSticker).toHaveBeenCalledTimes(1);
    });

    it('ảnh động nặng quá giới hạn bị từ chối ngay; ảnh tĩnh nặng vẫn mở trình chỉnh và gửi bản đã thu nhỏ', async () => {
        const shrunk = new File(['nho'], 'to.jpg', { type: 'image/jpeg' });
        vi.mocked(prepareStickerUpload).mockResolvedValueOnce(shrunk);
        const uploadSticker = vi.fn().mockResolvedValue(sticker({ id: 12, status: 'processing' }));
        const pack = packDetail();
        const api = fakeApi({
            uploadSticker,
            listPacks: vi.fn().mockResolvedValue({
                payload: [pack],
                meta: { max_upload_kb: 1, accepted_extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'], image_size: 64 },
            }),
        });
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        // GIF hai khung, đệm cho vượt 1 KB.
        const gifFrame = [0x21, 0xf9, 4, 0, 10, 0, 0, 0, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00, 2, 2, 0x4c, 0x01, 0];
        const gifBytes = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, ...gifFrame, ...gifFrame, 0x3b];
        const heavyGif = new File([Uint8Array.from(gifBytes), new Uint8Array(2048)], 'dong.gif', { type: 'image/gif' });
        const heavyStill = new File([new Uint8Array(4096)], 'to.png', { type: 'image/png' });
        fireEvent.change(screen.getByTestId('sticker-file-input'), { target: { files: [heavyGif, heavyStill] } });

        expect(await screen.findByText(/dong\.gif: ảnh động lớn hơn 1 KB/)).toBeTruthy();
        const editor = await screen.findByRole('dialog');
        expect(editor).toHaveTextContent('Ảnh 1/1 · to.png');

        await waitFor(() => expect(within(editor).getByRole('button', { name: 'Lưu sticker' })).toBeEnabled());
        fireEvent.click(within(editor).getByRole('button', { name: 'Lưu sticker' }));

        await waitFor(() => expect(uploadSticker).toHaveBeenCalledTimes(1));
        expect(prepareStickerUpload).toHaveBeenCalledWith(heavyStill, 1024);
        expect(uploadSticker.mock.calls[0][1]).toBe(shrunk);
    });

    it('đóng trình chỉnh thì bỏ các ảnh còn lại', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);
        await openFirstPack();

        fireEvent.change(screen.getByTestId('sticker-file-input'), {
            target: { files: [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.webp', { type: 'image/webp' })] },
        });
        fireEvent.click(await screen.findByRole('button', { name: 'Đóng trình chỉnh' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(api.uploadSticker).not.toHaveBeenCalled();
    });

    it('hiện lỗi i18n của sticker hỏng', async () => {
        const failed = sticker({ status: 'failed', failure_message: 'Sticker quá phức tạp.', image_url: null });
        render(<StickerLibraryManager api={fakeApi({ getPack: vi.fn().mockResolvedValue(packDetail({ stickers: [failed] })) })} />);
        await openFirstPack();

        expect(screen.getByText('Lỗi')).toBeTruthy();
        expect(screen.getByText('Sticker quá phức tạp.')).toBeTruthy();
    });

    it('tự làm mới khi còn sticker đang xử lý', async () => {
        const processing = packDetail({ stickers: [sticker({ status: 'processing', image_url: null, frames: null })] });
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
});
