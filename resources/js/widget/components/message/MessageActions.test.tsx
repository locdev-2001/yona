import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_TYPE } from '../../helpers/constants';
import { widgetStore } from '../../store/widgetStore';
import MessageActions from './MessageActions';
import type { WidgetMessage } from '../../types';

const NOW = 1758000000;

const ownMessage = (overrides: Partial<WidgetMessage> = {}): WidgetMessage => ({
    id: 77,
    content: 'Gửi sai ảnh rồi',
    message_type: MESSAGE_TYPE.INCOMING,
    status: 'sent',
    created_at: NOW - 60,
    ...overrides,
});

const setRecallWindow = (seconds: number) => {
    act(() => widgetStore.setMessagingPolicy({ recallWindowSeconds: seconds, stickers: [] }));
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW * 1000);
    setRecallWindow(300);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('MessageActions', () => {
    it('nút trả lời gọi lại để mở khối trả lời', () => {
        const onReply = vi.fn();
        render(<MessageActions message={ownMessage()} isOwn onReply={onReply} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

        expect(onReply).toHaveBeenCalledTimes(1);
    });

    it('thu hồi nằm trong menu "thêm", hỏi xác nhận 2 nút rồi mới gọi store', () => {
        const recall = vi.spyOn(widgetStore, 'recallMessage').mockResolvedValue();
        render(<MessageActions message={ownMessage()} isOwn onReply={() => undefined} />);

        fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Unsend' }));

        const dialog = screen.getByRole('alertdialog');
        expect(dialog.textContent).toContain('Unsend this message?');
        expect(dialog.textContent).toContain('5 minutes');
        expect(recall).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Unsend' }));
        expect(recall).toHaveBeenCalledWith(77);
    });

    it('huỷ xác nhận thì không thu hồi', () => {
        const recall = vi.spyOn(widgetStore, 'recallMessage').mockResolvedValue();
        render(<MessageActions message={ownMessage()} isOwn onReply={() => undefined} />);

        fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Unsend' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(recall).not.toHaveBeenCalled();
    });

    it('quá hạn thu hồi của kênh thì menu không còn mục Thu hồi', () => {
        render(<MessageActions message={ownMessage({ created_at: NOW - 301 })} isOwn onReply={() => undefined} />);

        const moreButton = screen.queryByRole('button', { name: 'More actions' });
        if (moreButton) fireEvent.click(moreButton);

        expect(screen.queryByRole('menuitem', { name: 'Unsend' })).toBeNull();
    });

    it('tin của agent không có mục Thu hồi', () => {
        render(
            <MessageActions
                message={ownMessage({ message_type: MESSAGE_TYPE.OUTGOING })}
                isOwn={false}
                onReply={() => undefined}
            />,
        );

        const moreButton = screen.queryByRole('button', { name: 'More actions' });
        if (moreButton) fireEvent.click(moreButton);

        expect(screen.queryByRole('menuitem', { name: 'Unsend' })).toBeNull();
    });
});

describe('cảm xúc', () => {
    const agentMessage = (reactions: unknown[] = []): WidgetMessage => ({
        id: 88,
        content: 'Dạ còn 2 cái ạ',
        message_type: MESSAGE_TYPE.OUTGOING,
        status: 'sent',
        created_at: NOW - 60,
        content_attributes: { reactions },
    });

    beforeEach(() => {
        act(() => widgetStore.setMessagingPolicy({ reactions: ['👍', '❤️', '😆'] }));
    });

    it('tin của shop có nút cảm xúc, tin của khách thì không', () => {
        const { unmount } = render(<MessageActions message={ownMessage()} isOwn onReply={() => undefined} />);
        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
        unmount();

        render(<MessageActions message={agentMessage()} isOwn={false} onReply={() => undefined} />);
        fireEvent.click(screen.getByRole('button', { name: 'React' }));
        expect(screen.getAllByRole('menuitemradio').map(item => item.textContent)).toEqual(['👍', '❤️', '😆']);
    });

    it('chọn một biểu cảm thì thả; bấm lại đúng cái đang giữ thì gỡ', () => {
        const react = vi.spyOn(widgetStore, 'reactToMessage').mockResolvedValue();
        act(() => widgetStore.setChannelConfig({ widgetColor: '#1f6feb' } as never, {} as never, { id: 5 } as never));

        const { rerender } = render(<MessageActions message={agentMessage()} isOwn={false} onReply={() => undefined} />);
        fireEvent.click(screen.getByRole('button', { name: 'React' }));
        fireEvent.click(screen.getByRole('menuitemradio', { name: '❤️' }));
        expect(react).toHaveBeenLastCalledWith(88, '❤️');
        expect(screen.queryByRole('menuitemradio')).toBeNull();

        rerender(<MessageActions message={agentMessage([{ emoji: '❤️', by: 'contact:5', at: 1 }])} isOwn={false} onReply={() => undefined} />);
        fireEvent.click(screen.getByRole('button', { name: 'React' }));
        expect(screen.getByRole('menuitemradio', { name: '❤️' }).getAttribute('aria-checked')).toBe('true');
        fireEvent.click(screen.getByRole('menuitemradio', { name: '❤️' }));
        expect(react).toHaveBeenLastCalledWith(88, null);
    });
});
