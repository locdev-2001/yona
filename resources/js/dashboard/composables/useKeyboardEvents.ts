import { useEffect, useRef } from 'react';
import { createKeybindingsHandler } from 'tinykeys';
import type { KeybindingsMap } from 'tinykeys';

// Port từ dashboard/composables/useKeyboardEvents.js + shared/helpers/KeyboardHelpers.js
// (phần typeable/QWERTZ) + composables/useDetectKeyboardLayout.js. Tổ hợp phím
// theo cú pháp tinykeys ('Alt+KeyE', '$mod+Alt+KeyE'); handler dạng hàm bị bỏ
// qua khi focus đang ở ô nhập, trừ khi khai báo allowOnFocusedInput.

export type KeyboardEventHandler = (event: KeyboardEvent) => void;

export interface KeyboardEventConfig {
    action: KeyboardEventHandler;
    allowOnFocusedInput?: boolean;
}

export type KeyboardEvents = Record<string, KeyboardEventHandler | KeyboardEventConfig>;

export const LAYOUT_QWERTY = 'QWERTY';
export const LAYOUT_QWERTZ = 'QWERTZ';
export const LAYOUT_AZERTY = 'AZERTY';

// QWERTZ: Alt+P / Alt+L cần thêm Shift.
export const keysToModifyInQWERTZ = new Set(['Alt+KeyP', 'Alt+KeyL']);

export const isEscape = (event: KeyboardEvent): boolean => event.key === 'Escape';

export const isActiveElementTypeable = (event: KeyboardEvent): boolean => {
    const activeElement = (event.target as HTMLElement | null) || (document.activeElement as HTMLElement | null);

    return Boolean(
        activeElement?.tagName === 'INPUT' ||
            activeElement?.tagName === 'NINJA-KEYS' ||
            activeElement?.tagName === 'TEXTAREA' ||
            activeElement?.contentEditable === 'true' ||
            (typeof activeElement?.className === 'string' && activeElement.className.includes('ProseMirror')),
    );
};

declare global {
    interface Window {
        cw_keyboard_layout?: string;
    }
    interface Navigator {
        keyboard?: { getLayoutMap(): Promise<Map<string, string>> };
    }
}

async function detectLayoutLegacy(): Promise<string> {
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.top = '-100px';
    document.body.appendChild(input);
    input.focus();

    return new Promise(resolve => {
        const keyboardEvent = new KeyboardEvent('keypress', {
            key: 'y',
            keyCode: 89,
            which: 89,
            bubbles: true,
            cancelable: true,
        } as KeyboardEventInit);

        const handler = (event: KeyboardEvent) => {
            document.body.removeChild(input);
            document.removeEventListener('keypress', handler);
            if (event.key === 'z') {
                resolve(LAYOUT_QWERTY);
            } else if (event.key === 'y') {
                resolve(LAYOUT_QWERTZ);
            } else {
                resolve(LAYOUT_AZERTY);
            }
        };

        document.addEventListener('keypress', handler);
        input.dispatchEvent(keyboardEvent);
    });
}

async function detectLayoutModern(): Promise<string> {
    const map = await navigator.keyboard!.getLayoutMap();
    return ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY']
        .map(code => map.get(code))
        .join('')
        .toUpperCase();
}

export async function detectKeyboardLayout(): Promise<string> {
    if (window.cw_keyboard_layout) {
        return window.cw_keyboard_layout;
    }
    const layout = navigator.keyboard ? await detectLayoutModern() : await detectLayoutLegacy();
    window.cw_keyboard_layout = layout;
    return layout;
}

export const shouldIgnoreEvent = (event: KeyboardEvent, handler: KeyboardEventHandler | KeyboardEventConfig): boolean => {
    const isTypeable = isActiveElementTypeable(event);
    const allowOnFocusedInput = typeof handler === 'function' ? false : Boolean(handler.allowOnFocusedInput);

    if (isTypeable) {
        if (isEscape(event)) {
            (event.target as HTMLElement | null)?.blur();
        }
        return !allowOnFocusedInput;
    }
    return false;
};

const keydownWrapper =
    (handler: KeyboardEventHandler | KeyboardEventConfig): KeyboardEventHandler =>
    event => {
        if (shouldIgnoreEvent(event, handler)) return;
        const actionToPerform = typeof handler === 'function' ? handler : handler.action;
        actionToPerform(event);
    };

// Đổi tên tổ hợp theo layout (QWERTZ thêm Shift) và bọc handler bằng keydownWrapper.
export function wrapEventsInKeybindingsHandler(events: KeyboardEvents, currentLayout: string): KeybindingsMap {
    const wrappedEvents: KeybindingsMap = {};

    Object.keys(events).forEach(originalEventName => {
        const modifiedEventName =
            currentLayout === LAYOUT_QWERTZ && keysToModifyInQWERTZ.has(originalEventName)
                ? `Shift+${originalEventName}`
                : originalEventName;
        wrappedEvents[modifiedEventName] = keydownWrapper(events[originalEventName]);
    });

    return wrappedEvents;
}

// Handler luôn đọc qua ref nên component không cần memo hóa map phím.
export function useKeyboardEvents(keyboardEvents: KeyboardEvents | null | undefined): void {
    const eventsRef = useRef(keyboardEvents);
    eventsRef.current = keyboardEvents;
    const bindingKeys = keyboardEvents ? Object.keys(keyboardEvents).join('|') : '';

    useEffect(() => {
        if (!bindingKeys) return undefined;

        const abortController = new AbortController();
        const liveEvents: KeyboardEvents = {};
        bindingKeys.split('|').forEach(name => {
            liveEvents[name] = {
                action: event => {
                    const current = eventsRef.current?.[name];
                    if (!current) return;
                    (typeof current === 'function' ? current : current.action)(event);
                },
                get allowOnFocusedInput() {
                    const current = eventsRef.current?.[name];
                    return typeof current === 'function' ? false : Boolean(current?.allowOnFocusedInput);
                },
            };
        });

        detectKeyboardLayout().then(layout => {
            if (abortController.signal.aborted) return;
            // tinykeys 4 mặc định bỏ qua phím từ ô nhập; việc đó do shouldIgnoreEvent quyết (allowOnFocusedInput).
            const keydownHandler = createKeybindingsHandler(wrapEventsInKeybindingsHandler(liveEvents, layout), {
                ignore: () => false,
            });
            document.addEventListener('keydown', keydownHandler, { signal: abortController.signal });
        });

        return () => abortController.abort();
    }, [bindingKeys]);
}
