import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { id: 1, name: 'Lộc' } } } }),
}));

import { setLocale } from '../../../i18n';
import AttachmentsPreview from './AttachmentsPreview';
import type { PendingAttachment } from './AttachmentsPreview';

const pending = (name: string, type: string, size: number, isVoiceMessage = false): PendingAttachment => ({
    currentChatId: 1,
    resource: new File([new Uint8Array(size)], name, { type }),
    isPrivate: false,
    thumb: `data:${type};base64,AAAA`,
    isVoiceMessage,
});

const tray = [
    pending('san-pham-1.jpg', 'image/jpeg', 100),
    pending('huong-dan-lap-dat-may-loc-nuoc-phien-ban-cuoi-cung.pdf', 'application/pdf', 300),
    pending('clip-mo-hop.mp4', 'video/mp4', 100),
    pending('ghi-am.mp3', 'audio/mpeg', 50, true),
];

describe('khay đính kèm của ô soạn', () => {
    beforeAll(() => setLocale('vi'));
    afterAll(() => setLocale('en'));

    afterEach(() => vi.restoreAllMocks());

    it('ảnh/video thành ảnh thu nhỏ 80px, tài liệu thành thẻ tệp, đếm số tệp (không tính ghi âm)', () => {
        render(<AttachmentsPreview attachments={tray} onRemoveAttachment={vi.fn()} />);

        const thumbnails = screen.getAllByTestId('pending-media');
        expect(thumbnails).toHaveLength(2);
        expect(thumbnails[0].className).toContain('size-20');
        expect(thumbnails[1].querySelector('video')).not.toBeNull();
        expect(screen.getAllByTestId('file-card')).toHaveLength(1);
        expect(screen.getByTestId('file-card').textContent).toContain('cung.pdf');
        expect(screen.getByText('3 tệp')).not.toBeNull();
        expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('bỏ từng tệp giữ nguyên các tệp còn lại theo thứ tự', () => {
        const onRemoveAttachment = vi.fn();
        render(<AttachmentsPreview attachments={tray} onRemoveAttachment={onRemoveAttachment} />);

        fireEvent.click(screen.getByRole('button', { name: /Bỏ tệp này: huong-dan-lap-dat/ }));

        expect(onRemoveAttachment).toHaveBeenCalledWith([tray[0], tray[2], tray[3]]);
    });

    it('bấm ảnh thu nhỏ mở trình xem ảnh lớn đúng ảnh đó; nút bỏ không mở trình xem', () => {
        const onRemoveAttachment = vi.fn();
        render(<AttachmentsPreview attachments={tray} onRemoveAttachment={onRemoveAttachment} />);

        fireEvent.click(screen.getByRole('button', { name: /Bỏ tệp này: san-pham-1/ }));
        expect(document.querySelector('.modal-mask')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Xem ảnh: san-pham-1.jpg' }));

        const viewer = document.querySelector('.modal-mask') as HTMLElement;
        expect(viewer).not.toBeNull();
        expect(viewer.querySelector(`img[src="${tray[0].thumb}"]`)).not.toBeNull();
        expect(viewer.textContent).toContain('san-pham-1.jpg');
    });

    it('tài liệu: bấm mở thì mở chính tệp ở tab mới, không bỏ tệp', () => {
        const onRemoveAttachment = vi.fn();
        const createObjectURL = vi.fn(() => 'blob:tep-dang-chon');
        Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        render(<AttachmentsPreview attachments={tray} onRemoveAttachment={onRemoveAttachment} />);

        fireEvent.click(screen.getByRole('button', { name: /Mở tệp: huong-dan-lap-dat/ }));

        expect(createObjectURL).toHaveBeenCalledWith(tray[1].resource);
        expect(open).toHaveBeenCalledWith('blob:tep-dang-chon', '_blank', 'noopener');
        expect(onRemoveAttachment).not.toHaveBeenCalled();
    });

    it('chỉ có ghi âm thì không hiện khay', () => {
        const { container } = render(
            <AttachmentsPreview attachments={[tray[3]]} onRemoveAttachment={vi.fn()} />,
        );

        expect(container.querySelector('[data-testid="attachment-tray"]')).toBeNull();
    });
});
