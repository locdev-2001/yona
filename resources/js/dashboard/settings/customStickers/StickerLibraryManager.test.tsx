import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';
import { setLocale } from '../../../i18n';
import StickerLibraryManager, { REORDER_DEBOUNCE_MS } from './StickerLibraryManager';
import type { StickerLibraryApi } from './stickerLibraryApi';
import { prepareStickerUpload } from './stickerUploadFile';
import { POLL_DELAYS_MS } from './useProcessingPoll';
import type { LibrarySticker, LibraryStickerPack, LibraryStickerPackDetail } from './types';

vi.mock('./stickerUploadFile', async importOriginal => ({
    ...(await importOriginal<typeof import('./stickerUploadFile')>()),
    prepareStickerUpload: vi.fn(async (file: File) => file),
}));

vi.mock('./stickerSourceImage', async importOriginal => ({
    ...(await importOriginal<typeof import('./stickerSourceImage')>()),
    loadImage: vi.fn(async () => ({ width: 10, height: 10 })),
    releaseImage: vi.fn(),
}));

// Trình chỉnh ảnh có bộ test riêng; ở đây chỉ cần hợp đồng files/rejected/onUpload/onClose.
vi.mock('./StickerImageEditor', () => ({
    default: ({ files, reedit, rejected, onUpload, onClose }: {
        files: File[];
        reedit?: { edit: unknown; sticker: { label: string | null } };
        rejected: { name: string }[];
        onUpload: (file: File, upload: unknown, options: object) => Promise<{ id: number; existing: boolean }>;
        onClose: (summary: { addedIds: number[]; existingIds: number[]; skipped: number; failed: { name: string; error: string }[] }) => void;
    }) => (
        <div role="dialog" aria-label={reedit ? `Chỉnh lại ${JSON.stringify(reedit.edit)}` : 'Thêm sticker'}>
            <span>{`${files.map(file => file.name).join(', ')} · bỏ qua ${rejected.map(file => file.name).join(', ')}`}</span>
            <button
                type="button"
                onClick={async () => {
                    const created = await onUpload(files[0], { edit: { crop: null }, label: 'Mèo', keywords: [] }, {});
                    onClose({
                        addedIds: created.existing ? [] : [created.id],
                        existingIds: created.existing ? [created.id] : [],
                        skipped: files.length - 1,
                        failed: [],
                    });
                }}
            >
                Lưu sticker
            </button>
            <button type="button" onClick={() => onClose({ addedIds: [], existingIds: [], skipped: files.length, failed: [] })}>
                Đóng trình chỉnh
            </button>
        </div>
    ),
}));

function stubViewport(width: number) {
    vi.stubGlobal('matchMedia', (query: string) => {
        const min = /min-width:\s*(\d+)px/.exec(query);
        const max = /max-width:\s*(\d+)px/.exec(query);
        const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));

        return { matches, media: query, addEventListener: () => undefined, removeEventListener: () => undefined };
    });
}

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));
beforeEach(() => {
    stubViewport(1440);
    window.history.replaceState(null, '', '/app/accounts/7/settings/custom-stickers');
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

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
    edit: null,
    has_original: true,
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

const META = { max_upload_kb: 10240, accepted_extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'], image_size: 64 };

function fakeApi(overrides: Partial<StickerLibraryApi> = {}, packs: LibraryStickerPack[] = [packDetail()]): StickerLibraryApi {
    return {
        listPacks: vi.fn().mockResolvedValue({ payload: packs, meta: META }),
        createPack: vi.fn(),
        getPack: vi.fn().mockResolvedValue(packDetail()),
        renamePack: vi.fn(),
        setPublished: vi.fn().mockResolvedValue({ ...packDetail(), published: true }),
        deletePack: vi.fn().mockResolvedValue(undefined),
        uploadSticker: vi.fn(),
        reorderStickers: vi.fn().mockResolvedValue(packDetail()),
        updateSticker: vi.fn(),
        reeditSticker: vi.fn(),
        getStickerOriginal: vi.fn(),
        deleteSticker: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

const grid = () => screen.findByRole('listbox', { name: /Sticker trong bộ/ });
const tileIds = () => within(screen.getByRole('listbox')).getAllByRole('option').map(option => option.getAttribute('data-sticker-id'));

describe('StickerLibraryManager · desktop', () => {
    it('tự chọn bộ đầu tiên, ô chỉ có ảnh và nhãn nằm ở aria-label', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);

        const option = within(await grid()).getByRole('option');
        expect(option).toHaveAccessibleName('Chó vẫy · 0 từ khoá');
        expect(option).not.toHaveTextContent('Sẵn sàng');
        expect(api.getPack).toHaveBeenCalledWith(3);
        expect(screen.getByText('1/120 sticker · PNG, JPG, WebP, GIF · sticker 64×64')).toBeInTheDocument();
    });

    it('?pack= mở đúng bộ, chọn bộ khác ghi lại query', async () => {
        window.history.replaceState(null, '', '/x?tab=platform&pack=9');
        const cats = packDetail({ id: 9, name: 'Mèo' });
        const api = fakeApi({ getPack: vi.fn(async (id: number) => (id === 9 ? cats : packDetail())) }, [packDetail(), cats]);
        render(<StickerLibraryManager api={api} />);

        expect(await screen.findByRole('listbox', { name: 'Sticker trong bộ «Mèo»' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Chó vui/ }));
        expect(await screen.findByRole('listbox', { name: 'Sticker trong bộ «Chó vui»' })).toBeInTheDocument();
        expect(window.location.search).toBe('?tab=platform&pack=3');
    });

    it('phản hồi cũ của bộ trước không ghi đè bộ vừa chọn', async () => {
        let resolveSlow: (pack: LibraryStickerPackDetail) => void = () => undefined;
        const cats = packDetail({ id: 9, name: 'Mèo' });
        const getPack = vi.fn((id: number) =>
            id === 3 ? new Promise<LibraryStickerPackDetail>(resolve => (resolveSlow = resolve)) : Promise.resolve(cats),
        );
        render(<StickerLibraryManager api={fakeApi({ getPack }, [packDetail(), cats])} />);

        fireEvent.click(await screen.findByRole('button', { name: /Mèo/ }));
        expect(await screen.findByRole('listbox', { name: 'Sticker trong bộ «Mèo»' })).toBeInTheDocument();
        await act(async () => resolveSlow(packDetail()));
        expect(screen.getByRole('listbox', { name: 'Sticker trong bộ «Mèo»' })).toBeInTheDocument();
    });

    it('Switch xuất bản khoá khi chưa có sticker sẵn sàng; xuất bản xong báo toast', async () => {
        const empty = packDetail({ stickers: [] });
        const { unmount } = render(<StickerLibraryManager api={fakeApi({ getPack: vi.fn().mockResolvedValue(empty) })} />);
        expect(await screen.findByRole('switch', { name: 'Xuất bản' })).toBeDisabled();
        expect(screen.getByText('Thêm ít nhất 1 sticker để xuất bản')).toBeInTheDocument();
        unmount();

        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);
        fireEvent.click(await screen.findByRole('switch', { name: 'Xuất bản' }));
        await waitFor(() => expect(api.setPublished).toHaveBeenCalledWith(3, true));
        expect(await screen.findByText('Đã xuất bản «Chó vui» · hiện trong hộp thư và widget')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Xuất bản' })).toHaveAttribute('aria-checked', 'true');
    });

    it('tạo bộ mới từ nút +: Enter tạo, cảnh báo trùng tên nhưng vẫn cho tạo', async () => {
        const created = packDetail({ id: 9, name: 'Chó vui', stickers: [] });
        const listPacks = vi
            .fn()
            .mockResolvedValueOnce({ payload: [packDetail()], meta: META })
            .mockResolvedValue({ payload: [packDetail(), created], meta: META });
        const api = fakeApi({ listPacks, createPack: vi.fn().mockResolvedValue(created), getPack: vi.fn(async (id: number) => (id === 9 ? created : packDetail())) });
        render(<StickerLibraryManager api={api} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Bộ mới' }));
        const input = screen.getByRole('textbox', { name: 'Tên bộ mới' });
        expect(input).toHaveFocus();
        fireEvent.change(input, { target: { value: ' chó VUI ' } });
        expect(screen.getByText('Đã có bộ tên này')).toBeInTheDocument();
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => expect(api.createPack).toHaveBeenCalledWith('chó VUI'));
        expect(await screen.findByText('Kéo ảnh vào đây hoặc dán từ clipboard')).toBeInTheDocument();
    });

    it('đổi tên bằng ô tên bộ: Esc trả tên cũ không gọi máy chủ, Enter lưu', async () => {
        const api = fakeApi({ renamePack: vi.fn().mockResolvedValue(packDetail({ name: 'Chó cực vui' })) });
        render(<StickerLibraryManager api={api} />);
        const nameInput = await screen.findByRole('textbox', { name: 'Tên bộ' });

        fireEvent.focus(nameInput);
        fireEvent.change(nameInput, { target: { value: 'Tạm' } });
        fireEvent.keyDown(nameInput, { key: 'Escape' });
        fireEvent.blur(nameInput);
        expect(nameInput).toHaveValue('Chó vui');
        expect(api.renamePack).not.toHaveBeenCalled();

        fireEvent.change(nameInput, { target: { value: 'Chó cực vui' } });
        fireEvent.blur(nameInput);
        await waitFor(() => expect(api.renamePack).toHaveBeenCalledWith(3, 'Chó cực vui'));
        expect(await screen.findByRole('button', { name: /Chó cực vui/ })).toBeInTheDocument();
    });

    it('chọn nhiều ảnh: lọc trước khi mở, trình chỉnh chỉ nhận ảnh hợp lệ kèm tệp bị loại, xong thì tóm tắt', async () => {
        const uploadSticker = vi.fn().mockResolvedValue({ ...sticker({ id: 12, status: 'processing', image_url: null }), existing: false });
        const api = fakeApi({ uploadSticker });
        render(<StickerLibraryManager api={api} />);
        await grid();

        const first = new File(['a'], 'meo.png', { type: 'image/png' });
        const notImage = new File(['{}'], 'cu.json', { type: 'application/json' });
        const second = new File(['b'], 'cho.gif', { type: 'image/gif' });
        fireEvent.change(screen.getByTestId('sticker-file-input'), { target: { files: [first, notImage, second] } });

        expect(await screen.findByText('meo.png, cho.gif · bỏ qua cu.json')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Lưu sticker' }));

        expect(await screen.findByText('Đã thêm 1 sticker · Bỏ qua 1')).toBeInTheDocument();
        expect(uploadSticker).toHaveBeenCalledWith(3, first, { edit: { crop: null }, label: 'Mèo', keywords: [] }, {});
        expect(prepareStickerUpload).toHaveBeenCalledWith(first, 10240 * 1024);
        expect(screen.queryByRole('dialog', { name: 'Thêm sticker' })).toBeNull();
    });

    it('ảnh trùng (existing: true) không tính là sticker mới', async () => {
        const uploadSticker = vi.fn().mockResolvedValue({ ...sticker(), existing: true });
        render(<StickerLibraryManager api={fakeApi({ uploadSticker })} />);
        await grid();

        fireEvent.change(screen.getByTestId('sticker-file-input'), { target: { files: [new File(['a'], 'cu.png', { type: 'image/png' })] } });
        fireEvent.click(await screen.findByRole('button', { name: 'Lưu sticker' }));

        expect(await screen.findByText('1 ảnh đã có')).toBeInTheDocument();
    });

    it('không còn tệp hợp lệ nào thì không mở trình chỉnh, chỉ báo lỗi', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);
        await grid();

        fireEvent.change(screen.getByTestId('sticker-file-input'), { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });

        expect(await screen.findByText('Bỏ qua 1 tệp: a.txt (không phải ảnh PNG, JPG, WebP, GIF).')).toBeInTheDocument();
        expect(screen.queryByRole('dialog', { name: 'Thêm sticker' })).toBeNull();
        expect(api.uploadSticker).not.toHaveBeenCalled();
    });

    it('bấm ô mở ngăn chi tiết: sửa nhãn và từ khoá dạng chip, lưu một lần rồi báo Đã lưu', async () => {
        const updateSticker = vi.fn().mockResolvedValue(sticker({ label: 'Cười lớn', keywords: ['haha', 'hihi'] }));
        render(<StickerLibraryManager api={fakeApi({ updateSticker })} />);

        fireEvent.click(within(await grid()).getByRole('option'));
        const label = await screen.findByLabelText('Nhãn');
        expect(label).toHaveFocus();
        expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled();

        fireEvent.change(label, { target: { value: '  Cười lớn ' } });
        const keywords = screen.getByLabelText('Từ khoá');
        fireEvent.change(keywords, { target: { value: 'haha' } });
        fireEvent.keyDown(keywords, { key: 'Enter' });
        fireEvent.change(keywords, { target: { value: 'hihi' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

        await waitFor(() => expect(updateSticker).toHaveBeenCalledWith(3, 11, { label: 'Cười lớn', keywords: ['haha', 'hihi'] }));
        expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
        expect(screen.getByRole('option')).toHaveAccessibleName('Cười lớn · 2 từ khoá');
    });

    it('lỗi 422 của từ khoá hiện dưới đúng trường, không in nguyên văn validate', async () => {
        const rejection = new ApiError(422, { message: 'The keywords.0 field must not be greater than 40 characters.', errors: { 'keywords.0': ['raw'] } });
        render(<StickerLibraryManager api={fakeApi({ updateSticker: vi.fn().mockRejectedValue(rejection) })} />);

        fireEvent.click(within(await grid()).getByRole('option'));
        const keywords = await screen.findByLabelText('Từ khoá');
        fireEvent.change(keywords, { target: { value: 'haha' } });
        fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

        expect(await screen.findByText('Từ khoá «haha» dài quá 40 ký tự')).toBeInTheDocument();
        expect(screen.queryByText(/The keywords\.0/)).toBeNull();
        expect(screen.getByLabelText('Từ khoá')).toHaveAttribute('aria-invalid', 'true');
    });

    it('client chặn nhãn quá giới hạn trong meta trước khi gửi', async () => {
        const api = fakeApi({
            listPacks: vi.fn().mockResolvedValue({ payload: [packDetail()], meta: { ...META, max_label_length: 5 } }),
        });
        render(<StickerLibraryManager api={api} />);

        fireEvent.click(within(await grid()).getByRole('option'));
        fireEvent.change(await screen.findByLabelText('Nhãn'), { target: { value: 'Quá dài' } });
        expect(screen.getByText('Nhãn tối đa 5 ký tự')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled();
    });

    it('chọn ô khác khi đang sửa dở thì hỏi bỏ thay đổi', async () => {
        const two = packDetail({ stickers: [sticker({ id: 1, label: 'Một' }), sticker({ id: 2, label: 'Hai' })] });
        render(<StickerLibraryManager api={fakeApi({ getPack: vi.fn().mockResolvedValue(two) })} />);

        const [one, twoTile] = within(await grid()).getAllByRole('option');
        fireEvent.click(one);
        fireEvent.change(await screen.findByLabelText('Nhãn'), { target: { value: 'Một sửa' } });
        fireEvent.click(twoTile);

        const confirm = await screen.findByRole('alertdialog', { name: 'Bỏ thay đổi chưa lưu?' });
        fireEvent.click(within(confirm).getByRole('button', { name: 'Tiếp tục sửa' }));
        expect(screen.getByLabelText('Nhãn')).toHaveValue('Một sửa');
    });

    it('Đưa lên đầu cập nhật lạc quan và gom thành đúng một request sau debounce', async () => {
        const three = packDetail({ stickers: [sticker({ id: 1 }), sticker({ id: 2 }), sticker({ id: 3 })] });
        const api = fakeApi({ getPack: vi.fn().mockResolvedValue(three) });
        render(<StickerLibraryManager api={api} />);
        await grid();
        vi.useFakeTimers({ shouldAdvanceTime: true });

        fireEvent.click(within(screen.getAllByRole('option')[2].parentElement!).getByRole('button', { name: 'Tuỳ chọn sticker' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Đưa lên đầu' }));
        expect(tileIds()).toEqual(['3', '1', '2']);
        fireEvent.click(within(screen.getAllByRole('option')[2].parentElement!).getByRole('button', { name: 'Tuỳ chọn sticker' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Đưa lên đầu' }));
        expect(tileIds()).toEqual(['2', '3', '1']);
        expect(api.reorderStickers).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(REORDER_DEBOUNCE_MS);
        });
        expect(api.reorderStickers).toHaveBeenCalledTimes(1);
        expect(api.reorderStickers).toHaveBeenCalledWith(3, [2, 3, 1]);
    });

    it('lưu thứ tự lỗi thì trả thứ tự cũ và báo', async () => {
        const three = packDetail({ stickers: [sticker({ id: 1 }), sticker({ id: 2 }), sticker({ id: 3 })] });
        const api = fakeApi({ getPack: vi.fn().mockResolvedValue(three), reorderStickers: vi.fn().mockRejectedValue(new Error('x')) });
        render(<StickerLibraryManager api={api} />);
        await grid();
        vi.useFakeTimers({ shouldAdvanceTime: true });

        const [first] = screen.getAllByRole('option');
        first.focus();
        fireEvent.keyDown(first, { key: ' ' });
        fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'ArrowRight' });
        fireEvent.keyDown(screen.getAllByRole('option')[1], { key: ' ' });
        expect(tileIds()).toEqual(['2', '1', '3']);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(REORDER_DEBOUNCE_MS);
        });
        expect(api.reorderStickers).toHaveBeenCalledWith(3, [2, 1, 3]);
        expect(await screen.findByText('Không lưu được thứ tự')).toBeInTheDocument();
        expect(tileIds()).toEqual(['1', '2', '3']);
    });

    it('xoá sticker qua hộp xác nhận có ảnh và tên bộ; Esc đóng mà không xoá', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);
        const option = within(await grid()).getByRole('option');

        fireEvent.keyDown(option, { key: 'Delete' });
        const dialog = await screen.findByRole('alertdialog', { name: 'Xoá sticker' });
        expect(dialog).toHaveTextContent('Xoá sticker này khỏi bộ «Chó vui»?');
        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
        expect(api.deleteSticker).not.toHaveBeenCalled();

        fireEvent.keyDown(screen.getByRole('option'), { key: 'Delete' });
        fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Xoá sticker' }));
        await waitFor(() => expect(api.deleteSticker).toHaveBeenCalledWith(3, 11));
        expect(await screen.findByText('Đã xoá sticker')).toBeInTheDocument();
    });

    it('xoá bộ xong chọn bộ kế bên', async () => {
        const cats = packDetail({ id: 9, name: 'Mèo' });
        const listPacks = vi
            .fn()
            .mockResolvedValueOnce({ payload: [packDetail(), cats], meta: META })
            .mockResolvedValue({ payload: [cats], meta: META });
        const api = fakeApi({ listPacks, getPack: vi.fn(async (id: number) => (id === 9 ? cats : packDetail())) });
        render(<StickerLibraryManager api={api} />);
        await grid();

        fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn bộ' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Xoá bộ' }));
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('Xoá bộ «Chó vui» cùng 1 sticker? Không hoàn tác được.');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Xoá bộ' }));

        await waitFor(() => expect(api.deletePack).toHaveBeenCalledWith(3));
        expect(await screen.findByRole('listbox', { name: 'Sticker trong bộ «Mèo»' })).toBeInTheDocument();
    });

    it('không có quyền chuyển bộ thì menu không có mục chuyển kho', async () => {
        render(<StickerLibraryManager api={fakeApi()} />);
        await grid();

        fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn bộ' }));

        expect(screen.queryByRole('menuitem', { name: /Chuyển/ })).not.toBeInTheDocument();
    });

    it.each([
        ['account', 'Chuyển sang kho riêng', 'các tài khoản khác không còn thấy bộ', 'Đã chuyển «Chó vui» sang kho riêng'],
        ['platform', 'Chuyển lên kho nền tảng', 'mọi tài khoản sẽ thấy bộ', 'Đã chuyển «Chó vui» lên kho nền tảng'],
    ] as const)('chuyển bộ sang kho %s: hỏi trước, gọi API, bỏ bộ khỏi danh sách, toast mở kho kia', async (destination, label, consequence, done) => {
        const cats = packDetail({ id: 9, name: 'Mèo' });
        const listPacks = vi
            .fn()
            .mockResolvedValueOnce({ payload: [packDetail(), cats], meta: META })
            .mockResolvedValue({ payload: [cats], meta: META });
        const api = fakeApi({ listPacks, getPack: vi.fn(async (id: number) => (id === 9 ? cats : packDetail())) });
        const packTransfer = { destination, movePack: vi.fn().mockResolvedValue(packDetail()), openDestination: vi.fn() };
        render(<StickerLibraryManager api={api} packTransfer={packTransfer} />);
        await grid();

        fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn bộ' }));
        fireEvent.click(screen.getByRole('menuitem', { name: label }));
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent(consequence);
        expect(dialog).toHaveTextContent('Tin đã gửi vẫn giữ ảnh sticker.');
        expect(packTransfer.movePack).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole('button', { name: label }));

        await waitFor(() => expect(packTransfer.movePack).toHaveBeenCalledWith(3));
        expect(await screen.findByRole('listbox', { name: 'Sticker trong bộ «Mèo»' })).toBeInTheDocument();
        expect(screen.getByText(done)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Mở' }));
        expect(packTransfer.openDestination).toHaveBeenCalledWith(3);
    });

    it('huỷ hộp xác nhận chuyển bộ thì không gọi API', async () => {
        const packTransfer = { destination: 'platform' as const, movePack: vi.fn(), openDestination: vi.fn() };
        render(<StickerLibraryManager api={fakeApi()} packTransfer={packTransfer} />);
        await grid();

        fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn bộ' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Chuyển lên kho nền tảng' }));
        fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Huỷ' }));

        expect(packTransfer.movePack).not.toHaveBeenCalled();
        expect(screen.getByRole('listbox', { name: 'Sticker trong bộ «Chó vui»' })).toBeInTheDocument();
    });

    it('Chỉnh lại ảnh: tải ảnh gốc, mở trình chỉnh với edit đã lưu, lưu gửi PATCH edit rồi ô chuyển sang đang dựng', async () => {
        const savedEdit = { crop: { x: 0, y: 0, w: 1, h: 1 }, fit: 'contain' as const, removeBackground: false };
        const original = new File(['png'], 'Chó vẫy', { type: 'image/png' });
        const getStickerOriginal = vi.fn().mockResolvedValue(original);
        const reeditSticker = vi.fn().mockResolvedValue(sticker({ status: 'processing', edit: { crop: null } }));
        const published = packDetail({ published: true, stickers: [sticker({ edit: savedEdit })] });
        const api = fakeApi({ getPack: vi.fn().mockResolvedValue(published), getStickerOriginal, reeditSticker }, [published]);
        render(<StickerLibraryManager api={api} />);

        fireEvent.click(within(await grid()).getByRole('option'));
        fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh lại ảnh' }));

        expect(await screen.findByRole('dialog', { name: `Chỉnh lại ${JSON.stringify(savedEdit)}` })).toBeInTheDocument();
        expect(getStickerOriginal).toHaveBeenCalledWith(3, 11, 'Chó vẫy');
        fireEvent.click(screen.getByRole('button', { name: 'Lưu sticker' }));

        expect(await screen.findByText('Đã lưu, sticker đang được dựng lại')).toBeInTheDocument();
        expect(reeditSticker).toHaveBeenCalledWith(3, 11, { edit: { crop: null }, label: 'Mèo', keywords: [] }, {});
        expect(api.uploadSticker).not.toHaveBeenCalled();
    });

    it('sticker không còn ảnh gốc thì nút Chỉnh lại ảnh bị khoá; lượt chỉnh hỏng gần nhất hiện lý do', async () => {
        const legacy = sticker({ has_original: false, failure_message: 'Xoá nền xong ảnh không còn gì.' });
        render(<StickerLibraryManager api={fakeApi({ getPack: vi.fn().mockResolvedValue(packDetail({ stickers: [legacy] })) })} />);

        fireEvent.click(within(await grid()).getByRole('option'));
        expect(await screen.findByRole('button', { name: 'Chỉnh lại ảnh' })).toBeDisabled();
        expect(screen.getByText(/Lần chỉnh ảnh gần nhất chưa thành, sticker vẫn dùng ảnh cũ: Xoá nền xong/)).toBeInTheDocument();
    });

    it('sticker lỗi hiện failure_message trong ngăn chi tiết', async () => {
        const failed = sticker({ status: 'failed', failure_message: 'Ảnh hỏng.', image_url: null });
        render(<StickerLibraryManager api={fakeApi({ getPack: vi.fn().mockResolvedValue(packDetail({ stickers: [failed] })) })} />);

        fireEvent.click(within(await grid()).getByRole('option'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh hỏng.');
    });

    it('poll sticker đang xử lý theo backoff và chỉ ghép trạng thái, không đè nhãn vừa sửa', async () => {
        const processing = packDetail({ stickers: [sticker({ status: 'processing', image_url: null, frames: null })] });
        const readyWithOldLabel = packDetail({ stickers: [sticker({ label: 'Nhãn cũ' })] });
        const getPack = vi.fn().mockResolvedValueOnce(processing).mockRejectedValueOnce(new Error('mạng')).mockResolvedValue(readyWithOldLabel);
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<StickerLibraryManager api={fakeApi({ getPack })} />);
        expect(within(await grid()).getByRole('option')).toHaveAttribute('aria-busy', 'true');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_DELAYS_MS[0]);
        });
        expect(getPack).toHaveBeenCalledTimes(2);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_DELAYS_MS[1]);
        });
        expect(getPack).toHaveBeenCalledTimes(3);
        await waitFor(() => expect(screen.getByRole('option')).not.toHaveAttribute('aria-busy'));
        expect(screen.getByRole('option')).toHaveAccessibleName('Chó vẫy · 0 từ khoá');
    });

    it('tải lần đầu lỗi thì hiện Thử lại; làm mới sau đó lỗi chỉ báo toast', async () => {
        const listPacks = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue({ payload: [packDetail()], meta: META });
        render(<StickerLibraryManager api={fakeApi({ listPacks })} />);

        expect(await screen.findByText('Không tải được kho sticker')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(await grid()).toBeInTheDocument();
    });

    it('chưa có bộ nào: nút Tạo bộ đầu tiên mở ô nhập tên', async () => {
        render(<StickerLibraryManager api={fakeApi({}, [])} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Tạo bộ đầu tiên' }));
        expect(screen.getByRole('textbox', { name: 'Tên bộ mới' })).toHaveFocus();
    });
});

describe('StickerLibraryManager · điện thoại', () => {
    beforeEach(() => stubViewport(375));

    it('hai màn: danh sách trước, chạm bộ thì pushState ?pack=, nút quay lại về danh sách', async () => {
        const api = fakeApi();
        render(<StickerLibraryManager api={api} />);

        const packButton = await screen.findByRole('button', { name: /Chó vui/ });
        expect(screen.queryByRole('listbox')).toBeNull();
        fireEvent.click(packButton);

        expect(await grid()).toBeInTheDocument();
        expect(window.location.search).toBe('?pack=3');
        expect(screen.queryByRole('button', { name: /Chó vui.*sticker/ })).toBeNull();

        await act(async () => {
            window.history.replaceState(null, '', '/app/accounts/7/settings/custom-stickers');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
        expect(await screen.findByRole('button', { name: /Chó vui/ })).toBeInTheDocument();
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('chạm ô mở bottom sheet chi tiết; chế độ Sắp xếp chỉ gửi khi bấm Xong', async () => {
        window.history.replaceState(null, '', '/x?pack=3');
        const two = packDetail({ stickers: [sticker({ id: 1 }), sticker({ id: 2 })] });
        const api = fakeApi({ getPack: vi.fn().mockResolvedValue(two) });
        render(<StickerLibraryManager api={api} />);

        fireEvent.click(within(await grid()).getAllByRole('option')[0]);
        const sheet = await screen.findByRole('dialog', { name: 'Chi tiết sticker' });
        fireEvent.click(within(sheet).getByRole('button', { name: 'Huỷ' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn bộ' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Sắp xếp' }));
        const [first] = screen.getAllByRole('option');
        fireEvent.keyDown(first, { key: ' ' });
        fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'ArrowRight' });
        fireEvent.keyDown(screen.getAllByRole('option')[1], { key: ' ' });
        expect(tileIds()).toEqual(['2', '1']);

        await new Promise(resolve => setTimeout(resolve, REORDER_DEBOUNCE_MS + 50));
        expect(api.reorderStickers).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Xong' }));
        await waitFor(() => expect(api.reorderStickers).toHaveBeenCalledWith(3, [2, 1]));
    });
});
