import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';
import { setLocale } from '../../../i18n';
import StickerImageEditor from './StickerImageEditor';
import type { StickerReedit } from './StickerImageEditor';
import type { RejectedUpload } from './prepareUploadQueue';
import type { StickerEdit } from './stickerEdit';
import type { StickerUpload, UploadOptions } from './stickerLibraryApi';
import { DEFAULT_STICKER_LIMITS } from './stickerLimits';
import type { SourcePixels } from './stickerMaskRender';
import { decodeStickerSource } from './stickerSourceImage';
import { StickerFileTooLargeError } from './stickerUploadFile';
import type { UploadedSticker } from './types';

const { renderedEdits, renderGate } = vi.hoisted(() => ({
    renderedEdits: [] as StickerEdit[],
    renderGate: { wait: null as Promise<void> | null },
}));

vi.mock('./stickerSourceImage', async importOriginal => ({
    ...(await importOriginal<typeof import('./stickerSourceImage')>()),
    decodeStickerSource: vi.fn(),
}));
vi.mock('./stickerMaskRunner', async importOriginal => {
    const actual = await importOriginal<typeof import('./stickerMaskRunner')>();

    return {
        ...actual,
        createStickerMaskRunner: () => {
            const runner = actual.createInThreadMaskRunner();
            return {
                ...runner,
                render: async (edit: StickerEdit) => {
                    renderedEdits.push(edit);
                    if (renderGate.wait) await renderGate.wait;
                    return runner.render(edit);
                },
            };
        },
    };
});

const SIDE = 100;
const STAGE_PX = 400;
// Công cụ Vùng lấy nhìn cả ảnh cùng lề 12% cạnh dài: ảnh 100px thì vùng nhìn là -12..112.
const CROP_VIEW = { origin: -12, extent: 124 };

function paint(width: number, height: number, isSubject: (x: number, y: number) => boolean): SourcePixels {
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) rgba.set(isSubject(x, y) ? [220, 30, 30, 255] : [200, 200, 200, 255], (y * width + x) * 4);
    }

    return { width, height, rgba };
}

// Vật đỏ 40×40 giữa nền xám 100×100.
const redSquareOnGrey = () => paint(SIDE, SIDE, (x, y) => x >= 30 && x < 70 && y >= 30 && y < 70);

const decoded = (pixels: SourcePixels, animated = false) => ({ pixels, animated, bytes: new ArrayBuffer(8) });

const uploaded = (overrides: Partial<UploadedSticker> = {}): UploadedSticker => ({
    id: 21,
    label: null,
    keywords: [],
    status: 'processing',
    failure_message: null,
    position: 0,
    width: 64,
    height: 64,
    frames: null,
    image_url: null,
    static_url: null,
    edit: null,
    has_original: true,
    existing: false,
    ...overrides,
});

beforeAll(() => {
    setLocale('vi');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterAll(() => setLocale('en'));
// Đóng trình chỉnh gọi history.back(); jsdom phát popstate ở lượt sau, chờ nó xong để không lẫn sang test kế.
afterEach(() => new Promise(resolve => setTimeout(resolve, 20)));
beforeEach(() => {
    renderedEdits.length = 0;
    renderGate.wait = null;
    window.history.replaceState(null, '', '/app/accounts/7/settings/custom-stickers');
    vi.mocked(decodeStickerSource).mockReset().mockResolvedValue(decoded(redSquareOnGrey()));
});

type UploadMock = Mock<(file: File, upload: StickerUpload, options: UploadOptions) => Promise<UploadedSticker>>;

interface EditorSetup {
    names?: string[];
    rejected?: RejectedUpload[];
    onUpload?: UploadMock;
    reedit?: StickerReedit;
}

function renderEditor({ names = ['meo.png'], rejected = [], onUpload = vi.fn().mockResolvedValue(uploaded()) as UploadMock, reedit }: EditorSetup = {}) {
    const props = {
        files: names.map(name => new File(['png'], name, { type: 'image/png' })),
        reedit,
        rejected,
        imageSize: 64,
        limits: DEFAULT_STICKER_LIMITS,
        onUpload,
        onUpdateExisting: vi.fn().mockResolvedValue(undefined),
        onClose: vi.fn(),
    };
    render(<StickerImageEditor {...props} />);

    return props;
}

const saveButton = () => screen.getByRole('button', { name: /^(Lưu sticker|Lưu và tiếp)/ });

async function openStage() {
    const stage = await screen.findByTestId('sticker-edit-stage');
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: STAGE_PX, height: STAGE_PX, right: STAGE_PX, bottom: STAGE_PX, x: 0, y: 0, toJSON: () => ({}) });
    await waitFor(() => expect(saveButton()).toBeEnabled());

    return stage;
}

async function savedUpload(props: ReturnType<typeof renderEditor>, call = 0): Promise<StickerUpload> {
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());
    await waitFor(() => expect(props.onUpload).toHaveBeenCalledTimes(call + 1));

    return props.onUpload.mock.calls[call][1];
}

// Toạ độ trên màn của một điểm ảnh khi đang ở công cụ Vùng lấy.
const cropClient = (pixel: number) => ((pixel - CROP_VIEW.origin) / CROP_VIEW.extent) * STAGE_PX;

const tap = (element: HTMLElement, clientX: number, clientY: number, pointerType = 'mouse') => {
    fireEvent.pointerDown(element, { clientX, clientY, pointerId: 1, pointerType, button: 0 });
    fireEvent.pointerUp(element, { clientX, clientY, pointerId: 1, pointerType, button: 0 });
};

const tool = (name: string) => within(screen.getByRole('group', { name: 'Công cụ' })).getByRole('button', { name });
const toolbarUndo = () => screen.getAllByRole('button', { name: 'Hoàn tác' })[0];

describe('StickerImageEditor · vùng lấy', () => {
    it('mặc định Ôm chủ thể, không xoá nền; Lưu gửi edit đúng hợp đồng (fit cover) kèm nhãn và từ khoá', async () => {
        const props = renderEditor();
        await openStage();
        expect(screen.getByRole('heading', { level: 3, name: 'Thêm sticker · Ảnh 1/1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ôm chủ thể' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.change(screen.getByLabelText('Nhãn'), { target: { value: '  Mèo vẫy ' } });
        fireEvent.change(screen.getByLabelText('Từ khoá'), { target: { value: 'haha, hihi, HAHA' } });
        const upload = await savedUpload(props);

        expect(upload).toEqual({
            edit: { crop: { x: 0.27, y: 0.27, w: 0.47, h: 0.47 }, fit: 'cover', removeBackground: false, tolerance: 20, feather: 0, edits: [] },
            label: 'Mèo vẫy',
            keywords: ['haha', 'hihi'],
        });
    });

    it('Vừa khung đặt cả ảnh vào ô vuông theo cạnh dài (fit contain)', async () => {
        const props = renderEditor();
        await openStage();

        fireEvent.click(screen.getByRole('button', { name: 'Vừa khung' }));

        expect((await savedUpload(props)).edit).toMatchObject({ crop: { x: 0, y: 0, w: 1, h: 1 }, fit: 'contain' });
    });

    it('ảnh dọc có hai vật lớn không cùng lọt một ô vuông thì tự chọn Vừa khung, khung thò ra hai bên', async () => {
        vi.mocked(decodeStickerSource).mockResolvedValue(decoded(paint(30, 90, (x, y) => x >= 3 && x < 27 && ((y >= 3 && y < 27) || (y >= 63 && y < 87)))));
        const props = renderEditor();
        await openStage();

        expect(screen.getByRole('button', { name: 'Vừa khung' })).toHaveAttribute('aria-pressed', 'true');
        expect((await savedUpload(props)).edit).toMatchObject({ crop: { x: -1, y: 0, w: 3, h: 1 }, fit: 'contain' });
    });

    it('kéo khung chuyển sang Tuỳ chỉnh (fit contain); kéo góc được phóng khung', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.pointerDown(stage, { clientX: 200, clientY: 200, pointerId: 7, pointerType: 'touch' });
        fireEvent.pointerMove(stage, { clientX: 240, clientY: 180, pointerId: 7, pointerType: 'touch' });
        fireEvent.pointerUp(stage, { clientX: 240, clientY: 180, pointerId: 7, pointerType: 'touch' });
        expect(screen.getByRole('button', { name: 'Tuỳ chỉnh' })).toHaveAttribute('aria-pressed', 'true');

        const corner = screen.getByTestId('sticker-crop-frame').querySelector<HTMLElement>('[data-crop-corner="se"]')!;
        fireEvent.pointerDown(corner, { clientX: cropClient(86), clientY: cropClient(68), pointerId: 1, pointerType: 'mouse', button: 0 });
        fireEvent.pointerMove(stage, { clientX: 380, clientY: 330, pointerId: 1, pointerType: 'mouse' });
        fireEvent.pointerUp(stage, { clientX: 380, clientY: 330, pointerId: 1, pointerType: 'mouse' });

        const { edit } = await savedUpload(props);
        expect(edit).toMatchObject({ crop: { x: 0.39, y: 0.21, w: 0.69, h: 0.69 }, fit: 'contain' });
    });

    it('phím mũi tên liền nhau di chuyển khung, một lần Ctrl+Z hoàn tác cả loạt', async () => {
        const props = renderEditor();
        await openStage();
        const frame = screen.getByTestId('sticker-crop-frame');

        fireEvent.keyDown(frame, { key: 'ArrowLeft', shiftKey: true });
        fireEvent.keyDown(frame, { key: 'ArrowLeft' });
        fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
        fireEvent.keyDown(frame, { key: 'ArrowLeft', shiftKey: true });

        expect((await savedUpload(props)).edit.crop).toMatchObject({ x: 0.17, y: 0.27 });
    });
});

describe('StickerImageEditor · xoá nền, đũa thần, cọ', () => {
    it('kéo dung sai lên hết cỡ thì xoá sạch: báo đè trên ảnh, không cho lưu, Hoàn tác ngay tại chỗ', async () => {
        renderEditor();
        await openStage();

        fireEvent.click(screen.getByRole('switch', { name: 'Xoá nền' }));
        fireEvent.keyDown(screen.getByRole('slider', { name: 'Dung sai' }), { key: 'End' });

        await waitFor(() => expect(renderedEdits.at(-1)?.tolerance).toBe(100));
        const warning = await screen.findByText('Không còn gì sau khi xoá nền');
        expect(saveButton()).toBeDisabled();

        fireEvent.click(within(warning.parentElement!).getByRole('button', { name: 'Hoàn tác' }));
        await waitFor(() => expect(saveButton()).toBeEnabled());
    });

    it('Xoá nền tắt sẵn nên Dung sai bị khoá; bật mới chỉnh được; Dùng ảnh gốc đưa dung sai về 20', async () => {
        const props = renderEditor();
        await openStage();
        expect(screen.getByRole('switch', { name: 'Xoá nền' })).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByRole('slider', { name: 'Dung sai' })).toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(screen.getByRole('switch', { name: 'Xoá nền' }));
        fireEvent.click(screen.getByRole('button', { name: 'Tăng Dung sai' }));
        fireEvent.click(screen.getByRole('switch', { name: 'Xoá nền' }));
        expect(screen.getByRole('slider', { name: 'Dung sai' })).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('button', { name: 'Tăng Dung sai' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Dùng ảnh gốc' }));
        expect((await savedUpload(props)).edit).toMatchObject({ removeBackground: false, tolerance: 20, edits: [] });
    });

    it('thanh trượt không đổi giá trị khi chạm lên track, chỉ đổi khi kéo núm', async () => {
        renderEditor();
        await openStage();
        fireEvent.click(screen.getByRole('switch', { name: 'Xoá nền' }));
        const slider = screen.getByRole('slider', { name: 'Dung sai' });
        const track = slider.parentElement!;
        track.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40, right: 100, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });

        fireEvent.pointerDown(track, { clientX: 80, clientY: 10, pointerId: 3, pointerType: 'touch' });
        fireEvent.pointerMove(track, { clientX: 80, clientY: 200, pointerId: 3, pointerType: 'touch' });
        expect(slider).toHaveAttribute('aria-valuenow', '20');

        fireEvent.pointerDown(slider, { clientX: 20, clientY: 10, pointerId: 4, pointerType: 'touch' });
        fireEvent.pointerMove(slider, { clientX: 45, clientY: 10, pointerId: 4, pointerType: 'touch' });
        fireEvent.pointerUp(slider, { clientX: 45, clientY: 10, pointerId: 4, pointerType: 'touch' });
        expect(slider).toHaveAttribute('aria-valuenow', '45');
    });

    it('đũa thần: chạm vào ảnh đã phóng vùng lấy thì thêm lượt xoá / giữ tại đúng điểm chạm', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.click(tool('Đũa thần'));
        tap(stage, 200, 200, 'touch');
        fireEvent.click(screen.getByRole('button', { name: 'Giữ' }));
        tap(stage, 100, 300);

        const { edit } = await savedUpload(props);
        expect(edit.edits).toEqual([
            { op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 20 },
            { op: 'wand-keep', x: 0.25, y: 0.75, tolerance: 20 },
        ]);
    });

    it('đũa thần: kéo tay (không phải chạm) thì không áp', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.click(tool('Đũa thần'));
        fireEvent.pointerDown(stage, { clientX: 100, clientY: 100, pointerId: 1, pointerType: 'mouse', button: 0 });
        fireEvent.pointerUp(stage, { clientX: 180, clientY: 100, pointerId: 1, pointerType: 'mouse', button: 0 });

        expect((await savedUpload(props)).edit.edits).toEqual([]);
    });

    it('cọ khôi phục theo cỡ cọ đã chọn bằng −/+, hiện vòng xem trước cỡ cọ, một nét gồm các điểm đã tô', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.click(tool('Cọ'));
        fireEvent.click(screen.getByRole('button', { name: 'Khôi phục' }));
        for (let step = 0; step < 5; step++) fireEvent.click(screen.getByRole('button', { name: 'Tăng Cỡ cọ' }));
        expect(screen.getByText('10%')).toBeInTheDocument();
        expect(screen.getByTestId('sticker-brush-preview')).toBeInTheDocument();
        fireEvent.pointerDown(stage, { clientX: 40, clientY: 40, pointerId: 1, pointerType: 'mouse', button: 0 });
        fireEvent.pointerMove(stage, { clientX: 120, clientY: 40, pointerId: 1, pointerType: 'mouse' });
        fireEvent.pointerUp(stage, { clientX: 120, clientY: 40, pointerId: 1, pointerType: 'mouse' });

        const { edit } = await savedUpload(props);
        expect(edit.edits).toEqual([{ op: 'brush-keep', points: [[0.1, 0.1], [0.3, 0.1]], radius: 0.1 }]);
    });

    it('phím tắt cấp hộp: W/B/V đổi công cụ, Ctrl+Z hoàn tác và Ctrl+Shift+Z làm lại dù focus ở nền', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.keyDown(document.body, { key: 'w' });
        expect(tool('Đũa thần')).toHaveAttribute('aria-pressed', 'true');
        tap(stage, 20, 20);
        fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
        expect(toolbarUndo()).toBeDisabled();
        fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true });
        fireEvent.keyDown(document.body, { key: 'b' });
        expect(tool('Cọ')).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(document.body, { key: 'v' });
        expect(tool('Vùng lấy')).toHaveAttribute('aria-pressed', 'true');

        expect((await savedUpload(props)).edit.edits).toEqual([{ op: 'wand-remove', x: 0.05, y: 0.05, tolerance: 20 }]);
    });

    it('gõ chữ V trong ô nhãn không đổi công cụ; Ctrl+Enter lưu', async () => {
        const props = renderEditor();
        await openStage();
        fireEvent.click(tool('Đũa thần'));

        const label = screen.getByLabelText('Nhãn');
        fireEvent.keyDown(label, { key: 'v' });
        expect(tool('Đũa thần')).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(label, { key: 'Enter', ctrlKey: true });

        await waitFor(() => expect(props.onUpload).toHaveBeenCalledTimes(1));
    });

    it('không cho lưu khi bản xem trước chưa theo kịp bản nháp', async () => {
        renderEditor();
        await openStage();
        let release: () => void = () => undefined;
        renderGate.wait = new Promise(resolve => {
            release = resolve;
        });

        fireEvent.click(screen.getByRole('switch', { name: 'Xoá nền' }));
        expect(saveButton()).toBeDisabled();

        renderGate.wait = null;
        await act(async () => release());
        await waitFor(() => expect(saveButton()).toBeEnabled());
    });

    it('ảnh động mà trình duyệt không giải mã được từng khung: báo rõ và mặc định Vừa khung', async () => {
        vi.mocked(decodeStickerSource).mockResolvedValue(decoded(redSquareOnGrey(), true));
        renderEditor({ names: ['cho.gif'] });

        expect(await screen.findByText(/Trình duyệt này chưa xem trước được ảnh động/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Vừa khung' })).toHaveAttribute('aria-pressed', 'true');
    });
});

describe('StickerImageEditor · lưu và hàng chờ', () => {
    it('nhiều ảnh: dải hàng chờ, "Lưu và tiếp (1/2)", bỏ qua ảnh cuối thì hiện tóm tắt, Xong trả kết quả', async () => {
        const props = renderEditor({ names: ['a.png', 'b.png'], rejected: [{ name: 'not-image.txt', reason: 'type' }] });
        await openStage();

        expect(screen.getByText('2/3 ảnh hợp lệ · bỏ qua not-image.txt (không phải ảnh PNG, JPG, WebP, GIF)')).toBeInTheDocument();
        expect(within(screen.getByRole('list', { name: 'Hàng chờ ảnh' })).getAllByRole('listitem')).toHaveLength(2);
        expect(saveButton()).toHaveTextContent('Lưu và tiếp (1/2)');

        await savedUpload(props);
        expect(await screen.findByRole('heading', { level: 3, name: 'Thêm sticker · Ảnh 2/2' })).toBeInTheDocument();
        await waitFor(() => expect(saveButton()).toHaveTextContent('Lưu sticker'));

        fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ảnh này' }));
        expect(await screen.findByText('Đã thêm 1 · Bỏ qua 1 · 1 tệp không hợp lệ')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Xong' }));

        expect(props.onClose).toHaveBeenCalledWith({ addedIds: [21], existingIds: [], skipped: 1, failed: [] });
    });

    it('một ảnh lưu xong thì đóng luôn, nút trái ghi Huỷ', async () => {
        const props = renderEditor();
        await openStage();
        expect(screen.getByRole('button', { name: 'Huỷ' })).toBeInTheDocument();

        await savedUpload(props);

        await waitFor(() => expect(props.onClose).toHaveBeenCalledWith({ addedIds: [21], existingIds: [], skipped: 0, failed: [] }));
    });

    it('ảnh đã có trong bộ: báo ô và nhãn cũ, cập nhật nhãn và từ khoá cho sticker cũ', async () => {
        const onUpload = vi.fn().mockResolvedValue(uploaded({ id: 5, position: 2, label: 'Sao', existing: true })) as UploadMock;
        const props = renderEditor({ onUpload });
        await openStage();
        fireEvent.change(screen.getByLabelText('Nhãn'), { target: { value: 'Sao vàng' } });

        await savedUpload(props);
        expect(await screen.findByText('Ảnh này đã có trong bộ (ô 3, nhãn «Sao»).')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cập nhật nhãn và từ khoá cho sticker cũ' }));

        await waitFor(() => expect(props.onUpdateExisting).toHaveBeenCalledWith(5, { label: 'Sao vàng', keywords: [] }));
        await waitFor(() => expect(props.onClose).toHaveBeenCalledWith({ addedIds: [], existingIds: [5], skipped: 0, failed: [] }));
    });

    it('máy chủ báo nhãn quá dài: lỗi đặt dưới ô Nhãn, giữ trình chỉnh', async () => {
        const onUpload = vi.fn().mockRejectedValue(new ApiError(422, { message: 'x', errors: { label: ['too long'] } })) as UploadMock;
        const props = renderEditor({ onUpload });
        await openStage();

        await savedUpload(props);

        expect(await screen.findByText('Nhãn tối đa 255 ký tự')).toBeInTheDocument();
        expect(props.onClose).not.toHaveBeenCalled();
    });

    it('ảnh thu nhỏ rồi vẫn quá nặng thì báo rõ, giữ trình chỉnh', async () => {
        const onUpload = vi.fn().mockRejectedValue(new StickerFileTooLargeError()) as UploadMock;
        renderEditor({ onUpload });
        await openStage();

        fireEvent.click(saveButton());

        expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh quá lớn, thu nhỏ rồi vẫn vượt giới hạn tải lên.');
        expect(saveButton()).toBeEnabled();
    });
});

describe('StickerImageEditor · lưu tất cả', () => {
    const saveAllButton = () => screen.getByRole('button', { name: /^Lưu tất cả/ });

    it('ảnh đang chỉnh lưu theo bản nháp, ảnh còn lại lưu khung mặc định với công tắc xoá nền hiện hành; trùng và lỗi không dừng lượt lưu', async () => {
        const onUpload = vi
            .fn()
            .mockResolvedValueOnce(uploaded({ id: 1 }))
            .mockResolvedValueOnce(uploaded({ id: 5, existing: true }))
            .mockRejectedValueOnce(new ApiError(422, { errors: { file: ['Ảnh hỏng'] } }))
            .mockResolvedValueOnce(uploaded({ id: 4 })) as UploadMock;
        const props = renderEditor({ names: ['a.png', 'b.png', 'c.png', 'd.png'], onUpload });
        await openStage();
        expect(saveAllButton()).toHaveTextContent('Lưu tất cả (4 ảnh còn lại)');

        fireEvent.click(screen.getByRole('switch', { name: 'Xoá nền' }));
        fireEvent.click(screen.getByRole('button', { name: 'Vừa khung' }));
        fireEvent.change(screen.getByLabelText('Nhãn'), { target: { value: 'Mèo' } });
        await waitFor(() => expect(saveAllButton()).toBeEnabled());
        fireEvent.click(saveAllButton());

        expect(await screen.findByText('Đã thêm 2 · 1 ảnh đã có · 1 ảnh lỗi')).toBeInTheDocument();
        expect(screen.getByText('c.png: Ảnh hỏng')).toBeInTheDocument();
        expect(onUpload.mock.calls.map(([file]) => file.name)).toEqual(['a.png', 'b.png', 'c.png', 'd.png']);
        expect(onUpload.mock.calls[0][1]).toMatchObject({ edit: { fit: 'contain', removeBackground: true }, label: 'Mèo' });
        expect(onUpload.mock.calls[1][1]).toEqual({
            edit: { crop: { x: 0.27, y: 0.27, w: 0.47, h: 0.47 }, fit: 'cover', removeBackground: true, tolerance: 20, feather: 0, edits: [] },
            label: null,
            keywords: [],
        });

        fireEvent.click(screen.getByRole('button', { name: 'Xong' }));
        expect(props.onClose).toHaveBeenCalledWith({ addedIds: [1, 4], existingIds: [5], skipped: 0, failed: [{ name: 'c.png', error: 'Ảnh hỏng' }] });
    });

    it('chỉ lưu các ảnh từ ảnh đang chỉnh trở đi, hiện tiến độ; đóng giữa chừng thì huỷ phần còn lại', async () => {
        let signal: AbortSignal | undefined;
        const onUpload = vi
            .fn()
            .mockResolvedValueOnce(uploaded({ id: 1 }))
            .mockImplementationOnce((_file: File, _upload: StickerUpload, options: UploadOptions) => {
                signal = options.signal;
                return new Promise<UploadedSticker>(() => undefined);
            }) as UploadMock;
        const props = renderEditor({ names: ['a.png', 'b.png', 'c.png', 'd.png'], onUpload });
        await openStage();
        fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ảnh này' }));
        await waitFor(() => expect(saveAllButton()).toHaveTextContent('Lưu tất cả (3 ảnh còn lại)'));
        await waitFor(() => expect(saveAllButton()).toBeEnabled());

        fireEvent.click(saveAllButton());

        expect(await screen.findByText('Đang lưu 1/3 ảnh…')).toBeInTheDocument();
        expect(onUpload.mock.calls.map(([file]) => file.name)).toEqual(['b.png', 'c.png']);
        expect(screen.getByRole('button', { name: 'Đóng trình chỉnh' })).toBeDisabled();

        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.click(within(await screen.findByRole('alertdialog', { name: 'Bỏ 2 ảnh chưa lưu?' })).getByRole('button', { name: 'Bỏ' }));

        expect(signal?.aborted).toBe(true);
        expect(props.onClose).toHaveBeenCalledWith({ addedIds: [1], existingIds: [], skipped: 3, failed: [] });
        expect(onUpload).toHaveBeenCalledTimes(2);
    });

    it('một ảnh thì không có nút Lưu tất cả', async () => {
        renderEditor();
        await openStage();

        expect(screen.queryByRole('button', { name: /^Lưu tất cả/ })).toBeNull();
    });
});

describe('StickerImageEditor · chỉnh lại sticker đã lưu', () => {
    it('mở với edit, nhãn và từ khoá đã lưu; chưa đổi gì thì đóng không hỏi', async () => {
        const reedit: StickerReedit = {
            sticker: { label: 'Sao', keywords: ['sao'] },
            edit: { crop: { x: 0, y: 0, w: 1, h: 1 }, fit: 'contain', removeBackground: true, tolerance: 30, feather: 0, edits: [] },
        };
        const props = renderEditor({ reedit });
        await openStage();

        expect(screen.getByRole('heading', { level: 3, name: 'Chỉnh lại ảnh sticker' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Vừa khung' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('switch', { name: 'Xoá nền' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByLabelText('Nhãn')).toHaveValue('Sao');

        fireEvent.click(screen.getByRole('button', { name: 'Đóng trình chỉnh' }));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('lưu gửi lại nguyên edit đã lưu kèm nhãn và từ khoá cũ', async () => {
        const reedit: StickerReedit = { sticker: { label: 'Sao', keywords: ['sao'] }, edit: { crop: { x: 0.27, y: 0.27, w: 0.47, h: 0.47 }, removeBackground: false } };
        const props = renderEditor({ reedit });
        await openStage();

        expect(screen.getByRole('button', { name: 'Ôm chủ thể' })).toHaveAttribute('aria-pressed', 'true');
        expect(await savedUpload(props)).toEqual({
            edit: { crop: { x: 0.27, y: 0.27, w: 0.47, h: 0.47 }, fit: 'cover', removeBackground: false, tolerance: 20, feather: 0, edits: [] },
            label: 'Sao',
            keywords: ['sao'],
        });
    });
});

describe('StickerImageEditor · đóng', () => {
    it('chưa chỉnh gì thì X đóng ngay, không hỏi', async () => {
        const props = renderEditor();
        await openStage();

        fireEvent.click(screen.getByRole('button', { name: 'Đóng trình chỉnh' }));

        expect(props.onClose).toHaveBeenCalledWith({ addedIds: [], existingIds: [], skipped: 1, failed: [] });
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('đã chỉnh hoặc còn ảnh thì hỏi trước khi đóng (X và Esc); Tiếp tục chỉnh giữ nguyên', async () => {
        const props = renderEditor({ names: ['a.png', 'b.png', 'c.png'] });
        await openStage();

        fireEvent.keyDown(document, { key: 'Escape' });
        const confirm = await screen.findByRole('alertdialog', { name: 'Bỏ 3 ảnh chưa lưu?' });
        fireEvent.click(within(confirm).getByRole('button', { name: 'Tiếp tục chỉnh' }));
        expect(props.onClose).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Đóng trình chỉnh' }));
        fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ' }));
        expect(props.onClose).toHaveBeenCalledWith({ addedIds: [], existingIds: [], skipped: 3, failed: [] });
    });

    it('đang gửi thì X bị khoá; Esc hỏi rồi huỷ lượt gửi', async () => {
        let signal: AbortSignal | undefined;
        const onUpload = vi.fn((_file: File, _upload: StickerUpload, options: UploadOptions) => {
            signal = options.signal;
            return new Promise<UploadedSticker>(() => undefined);
        }) as UploadMock;
        const props = renderEditor({ onUpload });
        await openStage();

        fireEvent.click(saveButton());
        await waitFor(() => expect(screen.getByRole('button', { name: 'Đóng trình chỉnh' })).toBeDisabled());

        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.click(within(await screen.findByRole('alertdialog', { name: 'Bỏ 1 ảnh chưa lưu?' })).getByRole('button', { name: 'Bỏ' }));

        expect(signal?.aborted).toBe(true);
        expect(props.onClose).toHaveBeenCalledWith({ addedIds: [], existingIds: [], skipped: 1, failed: [] });
    });

    it('mở thì thêm một mục lịch sử; Back đóng hộp thay vì rời trang', async () => {
        window.history.replaceState({ page: { component: 'Settings' } }, '', window.location.href);
        const props = renderEditor();
        await openStage();
        expect(window.history.state).toEqual({ page: { component: 'Settings' }, stickerImageEditor: true });

        act(() => {
            window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
        });

        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('Back khi đã chỉnh thì hỏi; Tiếp tục chỉnh đặt lại mục lịch sử', async () => {
        const props = renderEditor();
        await openStage();
        fireEvent.change(screen.getByLabelText('Nhãn'), { target: { value: 'Mèo' } });
        window.history.replaceState(null, '', window.location.href);

        act(() => {
            window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
        });
        fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Tiếp tục chỉnh' }));

        expect(props.onClose).not.toHaveBeenCalled();
        expect(window.history.state).toMatchObject({ stickerImageEditor: true });
    });
});

describe('viền trắng', () => {
    it('mặc định tắt, xem trước đổi ngay, hoàn tác/làm lại và lưu độ dày đã chọn', async () => {
        const props = renderEditor();
        await openStage();
        const toggle = screen.getByRole('switch', { name: 'Viền trắng' });
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(screen.queryByRole('slider', { name: 'Độ dày' })).not.toBeInTheDocument();
        fireEvent.click(toggle);
        const slider = screen.getByRole('slider', { name: 'Độ dày' });
        expect(slider).toHaveAttribute('aria-valuenow', '3');
        fireEvent.keyDown(slider, { key: 'End' });
        await waitFor(() => expect(renderedEdits.at(-1)?.strokeWidth).toBe(0.08));
        fireEvent.click(toolbarUndo());
        expect(slider).toHaveAttribute('aria-valuenow', '3');
        fireEvent.click(screen.getByRole('button', { name: 'Làm lại' }));
        expect(slider).toHaveAttribute('aria-valuenow', '8');
        expect((await savedUpload(props)).edit.strokeWidth).toBe(0.08);
    });

    it('mở lại khôi phục viền và Dùng ảnh gốc tắt viền', async () => {
        const props = renderEditor({ reedit: { sticker: { label: 'Mèo', keywords: [] }, edit: { strokeWidth: 0.05, removeBackground: false } } });
        await openStage();
        expect(screen.getByRole('slider', { name: 'Độ dày' })).toHaveAttribute('aria-valuenow', '5');
        fireEvent.click(screen.getByRole('button', { name: 'Dùng ảnh gốc' }));
        expect(screen.getByRole('switch', { name: 'Viền trắng' })).toHaveAttribute('aria-checked', 'false');
        expect((await savedUpload(props)).edit.strokeWidth).toBeUndefined();
    });

    it('Lưu tất cả áp dụng viền cho cả ảnh đang chỉnh và các ảnh còn lại', async () => {
        const props = renderEditor({ names: ['a.png', 'b.png'] });
        await openStage();
        fireEvent.click(screen.getByRole('switch', { name: 'Viền trắng' }));
        fireEvent.keyDown(screen.getByRole('slider', { name: 'Độ dày' }), { key: 'Home' });
        const saveAll = screen.getByRole('button', { name: /Lưu tất cả/ });
        await waitFor(() => expect(saveAll).toBeEnabled());
        fireEvent.click(saveAll);
        await waitFor(() => expect(props.onUpload).toHaveBeenCalledTimes(2));
        expect(props.onUpload.mock.calls.map(([, upload]) => upload.edit.strokeWidth)).toEqual([0.01, 0.01]);
    });
});
