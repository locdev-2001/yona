import { describe, expect, it, vi } from 'vitest';

import {
    LAYOUT_QWERTY,
    LAYOUT_QWERTZ,
    isActiveElementTypeable,
    shouldIgnoreEvent,
    wrapEventsInKeybindingsHandler,
} from './useKeyboardEvents';

const keyEvent = (target: HTMLElement | null, key = 'e') =>
    ({ key, target, preventDefault: () => undefined }) as unknown as KeyboardEvent;

describe('isActiveElementTypeable', () => {
    it('input/textarea/contenteditable/ProseMirror/ninja-keys là ô nhập', () => {
        expect(isActiveElementTypeable(keyEvent(document.createElement('input')))).toBe(true);
        expect(isActiveElementTypeable(keyEvent(document.createElement('textarea')))).toBe(true);
        const editable = document.createElement('div');
        editable.contentEditable = 'true';
        expect(isActiveElementTypeable(keyEvent(editable))).toBe(true);
        const editor = document.createElement('div');
        editor.className = 'ProseMirror';
        expect(isActiveElementTypeable(keyEvent(editor))).toBe(true);
        expect(isActiveElementTypeable(keyEvent(document.createElement('ninja-keys')))).toBe(true);
        expect(isActiveElementTypeable(keyEvent(document.createElement('div')))).toBe(false);
    });
});

describe('shouldIgnoreEvent', () => {
    it('bỏ qua khi đang gõ trong ô nhập trừ khi allowOnFocusedInput', () => {
        const input = document.createElement('input');
        expect(shouldIgnoreEvent(keyEvent(input), () => undefined)).toBe(true);
        expect(shouldIgnoreEvent(keyEvent(input), { action: () => undefined })).toBe(true);
        expect(shouldIgnoreEvent(keyEvent(input), { action: () => undefined, allowOnFocusedInput: true })).toBe(false);
        expect(shouldIgnoreEvent(keyEvent(document.createElement('div')), () => undefined)).toBe(false);
    });

    it('Escape trong ô nhập thì blur ô đó', () => {
        const input = document.createElement('input');
        const blur = vi.spyOn(input, 'blur');
        shouldIgnoreEvent(keyEvent(input, 'Escape'), () => undefined);
        expect(blur).toHaveBeenCalled();
    });
});

describe('wrapEventsInKeybindingsHandler', () => {
    it('QWERTZ thêm Shift cho Alt+KeyP / Alt+KeyL, giữ nguyên phím khác', () => {
        const events = { 'Alt+KeyP': () => undefined, 'Alt+KeyE': () => undefined };
        expect(Object.keys(wrapEventsInKeybindingsHandler(events, LAYOUT_QWERTZ))).toEqual(['Shift+Alt+KeyP', 'Alt+KeyE']);
        expect(Object.keys(wrapEventsInKeybindingsHandler(events, LAYOUT_QWERTY))).toEqual(['Alt+KeyP', 'Alt+KeyE']);
    });

    it('handler bọc gọi action khi không bị bỏ qua', () => {
        const action = vi.fn();
        const wrapped = wrapEventsInKeybindingsHandler({ 'Alt+KeyE': { action } }, LAYOUT_QWERTY);
        const event = keyEvent(document.createElement('div'));
        wrapped['Alt+KeyE'](event);
        expect(action).toHaveBeenCalledWith(event);

        wrapped['Alt+KeyE'](keyEvent(document.createElement('input')));
        expect(action).toHaveBeenCalledTimes(1);
    });
});
