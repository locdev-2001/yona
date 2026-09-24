import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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

    it('ảnh/video thành thumbnail 64px, tài liệu thành thẻ tệp, đếm số tệp (không tính ghi âm)', () => {
        render(<AttachmentsPreview attachments={tray} onRemoveAttachment={vi.fn()} />);

        const thumbnails = screen.getAllByTestId('pending-media');
        expect(thumbnails).toHaveLength(2);
        expect(thumbnails[0].className).toContain('size-16');
        expect(thumbnails[1].querySelector('video')).not.toBeNull();
        expect(screen.getAllByTestId('file-card')).toHaveLength(1);
        expect(screen.getByTestId('file-card').textContent).toContain('cung.pdf');
        expect(screen.getByText('3 tệp')).not.toBeNull();
        expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('bỏ từng tệp giữ nguyên các tệp còn lại theo thứ tự', () => {
        const onRemoveAttachment = vi.fn();
        render(<AttachmentsPreview attachments={tray} onRemoveAttachment={onRemoveAttachment} />);

        fireEvent.click(screen.getByLabelText(/huong-dan-lap-dat/));

        expect(onRemoveAttachment).toHaveBeenCalledWith([tray[0], tray[2], tray[3]]);
    });

    it('đang gửi: mỗi tệp có tiến trình riêng, không bỏ tệp được', () => {
        render(
            <AttachmentsPreview
                attachments={tray}
                uploadProgress={{ loadedBytes: 275, totalBytes: 550 }}
                onRemoveAttachment={vi.fn()}
            />,
        );

        const progressValues = screen.getAllByRole('progressbar').map((bar) => bar.getAttribute('aria-valuenow'));
        // Thứ tự hiển thị: ảnh, video, rồi thẻ tệp; byte gửi theo thứ tự đính kèm.
        expect(progressValues).toStrictEqual(['100', '0', '58']);
        expect((screen.getByLabelText(/san-pham-1/) as HTMLButtonElement).disabled).toBe(true);
    });

    it('chỉ có ghi âm thì không hiện khay', () => {
        const { container } = render(
            <AttachmentsPreview attachments={[tray[3]]} onRemoveAttachment={vi.fn()} />,
        );

        expect(container.querySelector('[data-testid="attachment-tray"]')).toBeNull();
    });
});
