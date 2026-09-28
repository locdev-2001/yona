import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { ApiError } from 'dashboard/helper/apiClient';
import { setLocale } from '../../../i18n';
import StickerImageEditor from './StickerImageEditor';
import type { StickerEdit } from './stickerEdit';
import type { StickerUpload } from './stickerLibraryApi';
import type { SourcePixels } from './stickerMaskRender';
import { decodeStickerSource } from './stickerSourceImage';
import { StickerFileTooLargeError } from './stickerUploadFile';

const { renderedEdits } = vi.hoisted(() => ({ renderedEdits: [] as StickerEdit[] }));

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
                render: (edit: StickerEdit) => {
                    renderedEdits.push(edit);
                    return runner.render(edit);
                },
            };
        },
    };
});

const SIDE = 100;
const STAGE_PX = 400;

// Vật đỏ 40×40 giữa nền xám 100×100.
function redSquareOnGrey(): SourcePixels {
    const rgba = new Uint8ClampedArray(SIDE * SIDE * 4);
    for (let y = 0; y < SIDE; y++) {
        for (let x = 0; x < SIDE; x++) {
            const inSubject = x >= 30 && x < 70 && y >= 30 && y < 70;
            rgba.set(inSubject ? [220, 30, 30, 255] : [200, 200, 200, 255], (y * SIDE + x) * 4);
        }
    }

    return { width: SIDE, height: SIDE, rgba };
}

beforeAll(() => {
    setLocale('vi');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterAll(() => setLocale('en'));
beforeEach(() => {
    renderedEdits.length = 0;
    vi.mocked(decodeStickerSource).mockReset().mockResolvedValue({ pixels: redSquareOnGrey(), animated: false });
});

type SaveMock = Mock<(upload: StickerUpload) => Promise<void>>;

function renderEditor({ onSave = vi.fn<(upload: StickerUpload) => Promise<void>>().mockResolvedValue(undefined) }: { onSave?: SaveMock } = {}) {
    const props = {
        file: new File(['png'], 'meo.png', { type: 'image/png' }),
        position: 1,
        total: 2,
        imageSize: 64,
        onSave,
        onSkip: vi.fn(),
        onClose: vi.fn(),
    };
    render(<StickerImageEditor {...props} />);

    return props;
}

async function openStage() {
    const stage = await screen.findByTestId('sticker-edit-stage');
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: STAGE_PX, height: STAGE_PX, right: STAGE_PX, bottom: STAGE_PX, x: 0, y: 0, toJSON: () => ({}) });
    await waitFor(() => expect(saveButton()).toBeEnabled());

    return stage;
}

const saveButton = () => screen.getByRole('button', { name: 'Lưu sticker' });

async function savedUpload(props: ReturnType<typeof renderEditor>): Promise<StickerUpload> {
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());
    await waitFor(() => expect(props.onSave).toHaveBeenCalledTimes(1));

    return props.onSave.mock.calls[0][0];
}

const tap = (element: HTMLElement, clientX: number, clientY: number, pointerType = 'mouse') => {
    fireEvent.pointerDown(element, { clientX, clientY, pointerId: 1, pointerType, button: 0 });
    fireEvent.pointerUp(element, { clientX, clientY, pointerId: 1, pointerType, button: 0 });
};

describe('StickerImageEditor', () => {
    it('khung cắt mặc định ôm vật; Lưu gửi edit đúng hợp đồng kèm nhãn và từ khoá', async () => {
        const props = renderEditor();
        await openStage();
        expect(screen.getByText(/Ảnh 1\/2 · meo\.png/)).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Nhãn'), { target: { value: '  Mèo vẫy ' } });
        fireEvent.change(screen.getByLabelText('Từ khoá'), { target: { value: 'haha, hihi, HAHA' } });
        const upload = await savedUpload(props);

        expect(upload).toEqual({
            edit: { crop: { x: 0.27, y: 0.27, w: 0.47, h: 0.47 }, removeBackground: true, tolerance: 20, feather: 0, edits: [] },
            label: 'Mèo vẫy',
            keywords: ['haha', 'hihi'],
        });
    });

    it('kéo khung bằng cảm ứng và kéo góc bằng chuột để đổi cỡ khung vuông', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.pointerDown(stage, { clientX: 200, clientY: 200, pointerId: 7, pointerType: 'touch' });
        fireEvent.pointerMove(stage, { clientX: 240, clientY: 180, pointerId: 7, pointerType: 'touch' });
        fireEvent.pointerUp(stage, { clientX: 240, clientY: 180, pointerId: 7, pointerType: 'touch' });

        const corner = screen.getByTestId('sticker-crop-frame').querySelector<HTMLElement>('[data-crop-corner="se"]')!;
        fireEvent.pointerDown(corner, { clientX: 336, clientY: 296, pointerId: 1, pointerType: 'mouse', button: 0 });
        fireEvent.pointerMove(stage, { clientX: 380, clientY: 330, pointerId: 1, pointerType: 'mouse' });
        fireEvent.pointerUp(stage, { clientX: 380, clientY: 330, pointerId: 1, pointerType: 'mouse' });

        const { edit } = await savedUpload(props);
        expect(edit.crop).toEqual({ x: 0.37, y: 0.22, w: 0.61, h: 0.61 });
    });

    it('phím mũi tên di chuyển khung cắt', async () => {
        const props = renderEditor();
        await openStage();

        fireEvent.keyDown(screen.getByTestId('sticker-crop-frame'), { key: 'ArrowLeft', shiftKey: true });

        const { edit } = await savedUpload(props);
        expect(edit.crop).toMatchObject({ x: 0.17, y: 0.27 });
    });

    it('kéo dung sai thì dựng lại xem trước; dung sai quá cao xoá sạch thì báo và không cho lưu', async () => {
        renderEditor();
        await openStage();

        fireEvent.change(screen.getByRole('slider', { name: /Dung sai/ }), { target: { value: '100' } });

        await waitFor(() => expect(renderedEdits.at(-1)?.tolerance).toBe(100));
        expect(await screen.findByText('Không còn gì sau khi xoá nền. Giảm dung sai hoặc bấm Dùng ảnh gốc.')).toBeInTheDocument();
        expect(saveButton()).toBeDisabled();

        fireEvent.change(screen.getByRole('slider', { name: /Dung sai/ }), { target: { value: '30' } });
        await waitFor(() => expect(saveButton()).toBeEnabled());
    });

    it('đũa thần: chạm vào ảnh đã phóng vùng cắt thì thêm lượt xoá vùng tại đúng điểm chạm', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.click(screen.getByRole('button', { name: 'Đũa thần' }));
        tap(stage, 200, 200, 'touch');
        fireEvent.click(screen.getByRole('button', { name: 'Giữ vùng' }));
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

        fireEvent.click(screen.getByRole('button', { name: 'Đũa thần' }));
        fireEvent.pointerDown(stage, { clientX: 100, clientY: 100, pointerId: 1, pointerType: 'mouse', button: 0 });
        fireEvent.pointerUp(stage, { clientX: 180, clientY: 100, pointerId: 1, pointerType: 'mouse', button: 0 });

        expect((await savedUpload(props)).edit.edits).toEqual([]);
    });

    it('cọ khôi phục theo cỡ cọ đã chọn, một nét gồm các điểm đã tô', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.click(screen.getByRole('button', { name: 'Cọ' }));
        fireEvent.click(screen.getByRole('button', { name: 'Khôi phục' }));
        fireEvent.change(screen.getByRole('slider', { name: 'Cỡ cọ' }), { target: { value: '10' } });
        fireEvent.pointerDown(stage, { clientX: 40, clientY: 40, pointerId: 1, pointerType: 'mouse', button: 0 });
        fireEvent.pointerMove(stage, { clientX: 120, clientY: 40, pointerId: 1, pointerType: 'mouse' });
        fireEvent.pointerUp(stage, { clientX: 120, clientY: 40, pointerId: 1, pointerType: 'mouse' });

        const { edit } = await savedUpload(props);
        expect(edit.edits).toEqual([{ op: 'brush-keep', points: [[0.1, 0.1], [0.3, 0.1]], radius: 0.1 }]);
    });

    it('hoàn tác bỏ bước cuối; chưa có bước nào thì nút hoàn tác tắt', async () => {
        const props = renderEditor();
        const stage = await openStage();
        const undo = screen.getByRole('button', { name: 'Hoàn tác' });
        expect(undo).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Đũa thần' }));
        tap(stage, 20, 20);
        tap(stage, 200, 200);
        expect(await screen.findByText(/Không còn gì sau khi xoá nền/)).toBeInTheDocument();
        fireEvent.click(undo);

        const { edit } = await savedUpload(props);
        expect(edit.edits).toEqual([{ op: 'wand-remove', x: 0.05, y: 0.05, tolerance: 20 }]);
    });

    it('Dùng ảnh gốc tắt xoá nền và bỏ mọi nét chỉnh', async () => {
        const props = renderEditor();
        const stage = await openStage();

        fireEvent.click(screen.getByRole('button', { name: 'Đũa thần' }));
        tap(stage, 200, 200);
        fireEvent.click(screen.getByRole('button', { name: 'Dùng ảnh gốc' }));

        expect(screen.getByRole('checkbox', { name: 'Xoá nền' })).not.toBeChecked();
        const { edit } = await savedUpload(props);
        expect(edit).toMatchObject({ removeBackground: false, edits: [] });
    });

    it('ảnh động báo đang xem trước khung đầu', async () => {
        vi.mocked(decodeStickerSource).mockResolvedValue({ pixels: redSquareOnGrey(), animated: true });
        renderEditor();

        expect(await screen.findByText('Ảnh động: đang xem trước khung đầu, sticker vẫn giữ chuyển động.')).toBeInTheDocument();
    });

    it('không đọc được ảnh thì báo lỗi, cho bỏ qua', async () => {
        vi.mocked(decodeStickerSource).mockRejectedValue(new Error('broken'));
        const props = renderEditor();

        expect(await screen.findByRole('alert')).toHaveTextContent('Không đọc được ảnh này.');
        fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua ảnh này' }));
        expect(props.onSkip).toHaveBeenCalledTimes(1);
    });

    it('ảnh thu nhỏ rồi vẫn quá nặng thì báo rõ, giữ trình chỉnh', async () => {
        renderEditor({ onSave: vi.fn<(upload: StickerUpload) => Promise<void>>().mockRejectedValue(new StickerFileTooLargeError()) });
        await openStage();

        fireEvent.click(saveButton());

        expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh quá lớn, thu nhỏ rồi vẫn vượt giới hạn tải lên.');
    });

    it('máy chủ từ chối thì giữ trình chỉnh và hiện câu lỗi; nút đóng gọi onClose', async () => {
        const onSave = vi.fn<(upload: StickerUpload) => Promise<void>>().mockRejectedValue(new ApiError(422, { message: 'Ảnh quá lớn.' }));
        const props = renderEditor({ onSave });
        await openStage();

        fireEvent.click(saveButton());

        expect(await screen.findByRole('alert')).toHaveTextContent('Ảnh quá lớn.');
        expect(saveButton()).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Đóng trình chỉnh' }));
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });
});
