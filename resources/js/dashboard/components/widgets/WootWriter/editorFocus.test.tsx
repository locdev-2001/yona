import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2, features: {} } } }),
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: () => new Promise(() => undefined),
}));

import Editor from './Editor';
import type { EditorHandle } from './Editor';

class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
});

const editorHasFocus = () => Boolean(document.activeElement?.classList.contains('ProseMirror'));

describe('Editor · con trỏ khi ô soạn được dựng lại theo chế độ', () => {
    it('đang có con trỏ thì view mới giữ con trỏ, không có thì không cướp focus', () => {
        const ref = createRef<EditorHandle>();
        const editorIn = (isPrivate: boolean) => (
            <Editor
                ref={ref}
                value=""
                editorId={`reply-4-${isPrivate ? 'NOTE' : 'REPLY'}`}
                placeholder=""
                isPrivate={isPrivate}
                channelType="Channel::Zalo"
                uiSettings={{}}
                onChange={vi.fn()}
            />
        );
        const { rerender } = render(editorIn(false));

        rerender(editorIn(true));
        expect(editorHasFocus()).toBe(false);

        act(() => ref.current?.focusEditorInputField());
        rerender(editorIn(false));
        expect(editorHasFocus()).toBe(true);
    });
});
