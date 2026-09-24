import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';

import Messages from './Messages';
import UnreadMessages from './UnreadMessages';
import { leaveUnreadViewRoute } from '../App';
import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { IFrameHelper } from '../helpers/iframe';
import { widgetStore } from '../store/widgetStore';

afterEach(() => {
    vi.restoreAllMocks();
    window.location.hash = '#/';
});

// Khung xem trước tin mới không phải khung chat đang mở: đóng nó thì tin vẫn chưa
// đọc để bong bóng giữ badge tới khi khách mở khung chat thật.
describe('khung xem trước tin mới', () => {
    it('nút Đóng chỉ đóng khung xem trước, không nhờ SDK lật trạng thái mở của khung chat', () => {
        const sendMessage = vi.spyOn(IFrameHelper, 'sendMessage').mockImplementation(() => {});
        const onClose = vi.fn();
        emitter.on(WIDGET_BUS_EVENTS.ON_UNREAD_VIEW_CLOSE, onClose);

        const { container } = render(<UnreadMessages />);
        fireEvent.click(container.querySelector('.close-unread-button') as HTMLElement);
        emitter.off(WIDGET_BUS_EVENTS.ON_UNREAD_VIEW_CLOSE, onClose);

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'toggleBubble' }));
    });

    it('rời khung xem trước thì về màn hình chủ, màn khác giữ nguyên', () => {
        window.location.hash = '#/unread-messages';
        expect(leaveUnreadViewRoute()).toBe(true);
        expect(window.location.hash).toBe('#/');

        window.location.hash = '#/messages';
        expect(leaveUnreadViewRoute()).toBe(false);
        expect(window.location.hash).toBe('#/messages');
    });
});

describe('màn hội thoại dựng lúc khung chat đang đóng', () => {
    it('không ghi đã xem cho tới khi khách mở khung chat', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
        const setUserLastSeen = vi.spyOn(widgetStore, 'setUserLastSeen').mockResolvedValue();
        widgetStore.patchAppConfig({ isWidgetOpen: false });

        render(<Messages />);
        expect(setUserLastSeen).not.toHaveBeenCalled();

        act(() => widgetStore.patchAppConfig({ isWidgetOpen: true }));
        expect(setUserLastSeen).toHaveBeenCalledTimes(1);
    });
});
