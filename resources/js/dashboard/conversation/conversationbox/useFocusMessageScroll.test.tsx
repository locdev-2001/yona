import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FOCUS_HIGHLIGHT_CLASSES, FOCUS_HIGHLIGHT_MS, useFocusMessageScroll } from './useFocusMessageScroll';

interface ProbeProps {
    focusedMessageId: number | null;
    renderedIds: number[];
    onDone: () => void;
    exposeRef: (ref: MutableRefObject<number | null>) => void;
}

function Probe({ focusedMessageId, renderedIds, onDone, exposeRef }: ProbeProps) {
    const scrolledConversationRef = useRef<number | null>(null);
    exposeRef(scrolledConversationRef);
    useFocusMessageScroll({
        focusedMessageId,
        messages: renderedIds,
        conversationId: 12,
        scrolledConversationRef,
        onDone,
    });

    return (
        <ul>
            {renderedIds.map(id => (
                <li key={id} id={`message${id}`}>
                    tin {id}
                </li>
            ))}
        </ul>
    );
}

const scrollIntoView = vi.fn();

beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useFocusMessageScroll', () => {
    it('cuộn tin vào giữa, nháy nền rồi gỡ, báo đã xong', () => {
        const onDone = vi.fn();
        let scrolledRef: MutableRefObject<number | null> | null = null;

        const { container } = render(
            <Probe focusedMessageId={5} renderedIds={[4, 5, 6]} onDone={onDone} exposeRef={ref => (scrolledRef = ref)} />,
        );
        const target = container.querySelector('#message5')!;

        expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'center' });
        expect(scrollIntoView.mock.contexts[0]).toBe(target);
        expect(scrolledRef!.current).toBe(12);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect([...target.classList]).toEqual(expect.arrayContaining(FOCUS_HIGHLIGHT_CLASSES));

        act(() => vi.advanceTimersByTime(FOCUS_HIGHLIGHT_MS));

        FOCUS_HIGHLIGHT_CLASSES.forEach(className => expect(target.classList.contains(className)).toBe(false));
    });

    it('chờ tới khi tin được render', () => {
        const onDone = vi.fn();
        const { rerender } = render(
            <Probe focusedMessageId={9} renderedIds={[4, 5]} onDone={onDone} exposeRef={() => undefined} />,
        );

        expect(scrollIntoView).not.toHaveBeenCalled();
        expect(onDone).not.toHaveBeenCalled();

        rerender(<Probe focusedMessageId={9} renderedIds={[4, 5, 9]} onDone={onDone} exposeRef={() => undefined} />);

        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('không làm gì khi không có tin cần nhắm tới', () => {
        render(<Probe focusedMessageId={null} renderedIds={[4, 5]} onDone={vi.fn()} exposeRef={() => undefined} />);

        expect(scrollIntoView).not.toHaveBeenCalled();
    });
});
