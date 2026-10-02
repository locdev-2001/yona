import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ConversationMessage } from '../types';
import { LATEST_MESSAGE_DISTANCE_PX, countAppendedMessages, useScrollToLatest } from './useScrollToLatest';

const CURRENT_USER_ID = 1;
const PANEL_HEIGHT = 500;

function message(id: number, sender: ConversationMessage['sender'] = { id: 9, name: 'Khách', type: 'contact' }) {
    return { id, sender } as ConversationMessage;
}

/** Khung tin giả: jsdom không bố cục, nên scrollHeight do test đặt. */
function fakePanel(scrollHeight: number, scrollTop: number) {
    const panel = document.createElement('ul');
    Object.defineProperty(panel, 'clientHeight', { value: PANEL_HEIGHT, configurable: true });
    Object.defineProperty(panel, 'scrollHeight', { value: scrollHeight, configurable: true, writable: true });
    panel.scrollTop = scrollTop;
    panel.scrollTo = ((options: ScrollToOptions) => {
        panel.scrollTop = options.top ?? panel.scrollTop;
    }) as typeof panel.scrollTo;
    return panel;
}

function setup(panel: HTMLElement, initialMessages: ConversationMessage[]) {
    const panelRef = { current: panel };
    const scrolledConversationRef = { current: 4 as number | null };

    return renderHook(
        ({ messages }) =>
            useScrollToLatest({
                panelRef,
                messages,
                conversationId: 4,
                scrolledConversationRef,
                currentUserId: CURRENT_USER_ID,
            }),
        { initialProps: { messages: initialMessages } },
    );
}

describe('countAppendedMessages', () => {
    it.each([
        ['một tin nối vào cuối', [1, 2, 3], 2, 1],
        ['ba tin đến cùng lúc', [1, 2, 3, 4, 5], 2, 3],
        ['tin cuối cũ không còn trong danh sách', [7, 8], 2, 1],
        ['chưa có tin cuối trước đó', [1], null, 0],
    ])('%s', (_case, ids, previousLastId, expected) => {
        expect(countAppendedMessages(ids.map(id => message(id)), previousLastId)).toBe(expected);
    });
});

describe('useScrollToLatest', () => {
    it('đang ở gần đáy thì tin mới kéo khung xuống, không hiện nút', () => {
        const panel = fakePanel(2000, 2000 - PANEL_HEIGHT);
        const { result, rerender } = setup(panel, [message(1)]);

        Object.defineProperty(panel, 'scrollHeight', { value: 2300 });
        rerender({ messages: [message(1), message(2)] });

        expect(panel.scrollTop).toBe(2300);
        expect(result.current.isAwayFromLatest).toBe(false);
    });

    it('cuộn lên đọc tin cũ thì hiện nút; tin khách mới đến không giật khung mà đếm vào nút', () => {
        const panel = fakePanel(2000, 2000 - PANEL_HEIGHT);
        const { result, rerender } = setup(panel, [message(1)]);

        panel.scrollTop = 2000 - PANEL_HEIGHT - LATEST_MESSAGE_DISTANCE_PX - 1;
        act(() => result.current.onScroll(panel));
        expect(result.current.isAwayFromLatest).toBe(true);

        const readingPosition = panel.scrollTop;
        rerender({ messages: [message(1), message(2), message(3)] });

        expect(panel.scrollTop).toBe(readingPosition);
        expect(result.current.unseenCount).toBe(2);
    });

    it('đang đọc tin cũ mà chính mình gửi tin thì vẫn kéo xuống để thấy tin vừa gửi', () => {
        const panel = fakePanel(2000, 100);
        const { result, rerender } = setup(panel, [message(1)]);
        act(() => result.current.onScroll(panel));

        rerender({ messages: [message(1), message(2, { id: CURRENT_USER_ID, name: 'Lộc', type: 'user' })] });

        expect(panel.scrollTop).toBe(2000);
        expect(result.current.isAwayFromLatest).toBe(false);
    });

    it('bấm nút về tin cuối thì nút ẩn và xoá số tin chưa xem', () => {
        const panel = fakePanel(2000, 100);
        const { result, rerender } = setup(panel, [message(1)]);
        act(() => result.current.onScroll(panel));
        rerender({ messages: [message(1), message(2)] });

        act(() => {
            result.current.jump();
            result.current.onScroll(panel);
        });

        expect(result.current.isAwayFromLatest).toBe(false);
        expect(result.current.unseenCount).toBe(0);
    });
});
