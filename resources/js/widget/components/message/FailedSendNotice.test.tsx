import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_TYPE } from '../../helpers/constants';
import { widgetStore } from '../../store/widgetStore';
import UserMessage from '../UserMessage';
import type { WidgetMessage } from '../../types';

const failedMessage = (overrides: Partial<WidgetMessage> = {}): WidgetMessage => ({
    id: 'tam-1',
    content: 'Còn hàng không?',
    message_type: MESSAGE_TYPE.INCOMING,
    status: 'failed',
    created_at: 1758000000,
    ...overrides,
});

afterEach(() => vi.restoreAllMocks());

describe('khối lỗi tin gửi hỏng', () => {
    it('tin chữ hỏng vì mạng có dòng lỗi và nút Thử lại gọi store đúng id', () => {
        vi.spyOn(widgetStore, 'retryableFailureOf').mockReturnValue({ isNetworkFailure: true });
        const retry = vi.spyOn(widgetStore, 'retryMessage').mockResolvedValue();
        render(<UserMessage message={failedMessage()} />);

        expect(screen.getByRole('alert')).toHaveTextContent('Could not send the message');
        expect(screen.getByRole('alert')).toHaveTextContent('Connection is unstable, please try again.');
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(retry).toHaveBeenCalledWith('tam-1');
    });

    it('tin ảnh và tin tệp có tiêu đề riêng; máy chủ từ chối thì không báo lỗi mạng', () => {
        vi.spyOn(widgetStore, 'retryableFailureOf').mockReturnValue({ isNetworkFailure: false });
        const { rerender } = render(
            <UserMessage message={failedMessage({ attachments: [{ file_type: 'image' }, { file_type: 'image' }] })} />,
        );
        expect(screen.getByRole('alert')).toHaveTextContent('Could not send the photo');
        expect(screen.getByRole('alert')).not.toHaveTextContent('Connection is unstable');

        rerender(<UserMessage message={failedMessage({ attachments: [{ file_type: 'image' }, { file_type: 'file' }] })} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Could not send the file');
    });

    it('không còn payload trong bộ nhớ (đã tải lại trang) thì không hiện Thử lại', () => {
        vi.spyOn(widgetStore, 'retryableFailureOf').mockReturnValue(undefined);
        render(<UserMessage message={failedMessage()} />);

        expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    });

    it('tin đã gửi không có khối lỗi', () => {
        render(<UserMessage message={failedMessage({ id: 5, status: 'sent' })} />);

        expect(screen.queryByRole('alert')).toBeNull();
    });
});
