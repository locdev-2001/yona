import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_TYPE } from '../../helpers/constants';
import { widgetStore } from '../../store/widgetStore';
import type { MessageAttachment, WidgetMessage } from '../../types';
import MessageBody from './MessageBody';

const imageAttachment = (id: number): MessageAttachment => ({
    id,
    file_type: 'image',
    data_url: `/storage/anh-${id}.png`,
    file_size: 3 * 1024,
});

const messageWith = (attachments: MessageAttachment[], overrides: Partial<WidgetMessage> = {}): WidgetMessage => ({
    id: 900,
    content: '',
    message_type: MESSAGE_TYPE.INCOMING,
    created_at: 1758000000,
    status: 'sent',
    attachments,
    ...overrides,
});

const renderBody = (message: WidgetMessage) =>
    render(<MessageBody message={message} replyTo={null} isOwn position="single" />);

afterEach(() => vi.restoreAllMocks());

describe('MessageBody', () => {
    it('một ảnh tải hỏng chỉ hạ riêng ảnh đó xuống thẻ tệp, các ảnh còn lại giữ lưới', () => {
        const { container } = renderBody(messageWith([imageAttachment(1), imageAttachment(2), imageAttachment(3)]));

        fireEvent.error(container.querySelectorAll('.yona-image-grid img')[1]);

        const grid = container.querySelector('.yona-image-grid') as HTMLElement;
        expect(grid.querySelectorAll('img')).toHaveLength(2);
        expect(grid.dataset.layout).toBe('pair');
        const fileCards = container.querySelectorAll('.yona-file-bubble');
        expect(fileCards).toHaveLength(1);
        expect(fileCards[0]).toHaveTextContent('anh-2.png');
    });

    it('tệp đang gửi giữ tên tệp, cỡ và phần trăm, thanh 4px, nút huỷ gọi huỷ đúng tin', () => {
        const cancelSend = vi.spyOn(widgetStore, 'cancelSend').mockImplementation(() => {});
        renderBody(
            messageWith(
                [
                    {
                        file_type: 'file',
                        data_url: 'blob:preview',
                        file_name: 'business-object-erd-core.svg',
                        file_size: 1.2 * 1024 * 1024,
                        status: 'in_progress',
                        progress: 62,
                    },
                ],
                { id: 'tam-1', status: 'in_progress' },
            ),
        );

        expect(screen.getByText('business-object-erd-core.svg')).toBeInTheDocument();
        expect(screen.getByText('1.2 MB · uploading 62%')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');

        fireEvent.click(screen.getByRole('button', { name: 'Cancel upload' }));
        expect(cancelSend).toHaveBeenCalledWith('tam-1');
    });

    it('tải xong phần gửi lên (100%) thì không còn nút huỷ', () => {
        renderBody(
            messageWith(
                [{ file_type: 'file', data_url: 'blob:x', file_name: 'a.pdf', file_size: 2048, status: 'in_progress', progress: 100 }],
                { status: 'in_progress' },
            ),
        );

        expect(screen.queryByRole('button', { name: 'Cancel upload' })).not.toBeInTheDocument();
    });
});
