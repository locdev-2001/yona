import { useEffect, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

export const FOCUS_HIGHLIGHT_CLASSES = ['bg-n-amber-3', 'transition-colors', 'duration-700', 'rounded-lg'];
export const FOCUS_HIGHLIGHT_MS = 2500;

interface UseFocusMessageScrollArgs {
    focusedMessageId: number | null;
    messages: unknown[];
    conversationId: number;
    // Ref "đã cuộn lần đầu" của khung chat: đặt lại để khung không kéo xuống đáy nữa.
    scrolledConversationRef: MutableRefObject<number | null>;
    onDone: () => void;
}

interface ActiveHighlight {
    element: HTMLElement;
    timer: ReturnType<typeof setTimeout>;
}

// Cuộn tin đang được nhắm tới vào giữa khung và nháy nền một lúc. Là layout
// effect gọi SAU các effect cuộn đáy của khung chat nên thắng, trước khi trình
// duyệt kịp vẽ. Tin chưa render thì chờ lần render sau.
export function useFocusMessageScroll({
    focusedMessageId,
    messages,
    conversationId,
    scrolledConversationRef,
    onDone,
}: UseFocusMessageScrollArgs): void {
    const highlightRef = useRef<ActiveHighlight | null>(null);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useLayoutEffect(() => {
        if (focusedMessageId === null) return;

        const element = document.getElementById(`message${focusedMessageId}`);
        if (!element) return;

        element.scrollIntoView({ block: 'center' });
        scrolledConversationRef.current = conversationId;

        removeHighlight(highlightRef);
        element.classList.add(...FOCUS_HIGHLIGHT_CLASSES);
        highlightRef.current = {
            element,
            timer: setTimeout(() => removeHighlight(highlightRef), FOCUS_HIGHLIGHT_MS),
        };

        onDoneRef.current();
    }, [focusedMessageId, messages, conversationId, scrolledConversationRef]);

    useEffect(() => () => removeHighlight(highlightRef), []);
}

function removeHighlight(highlightRef: MutableRefObject<ActiveHighlight | null>): void {
    const active = highlightRef.current;
    if (!active) return;

    clearTimeout(active.timer);
    active.element.classList.remove(...FOCUS_HIGHLIGHT_CLASSES);
    highlightRef.current = null;
}
