import { fireEvent, render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2, features: {} } } }),
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: () => new Promise(() => undefined),
}));

import Editor from './Editor';

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

function renderEditor() {
    const onSend = vi.fn();
    const { container } = render(
        <Editor
            value="note: lỗi duplicate tin nhắn"
            editorId="reply-4-REPLY"
            placeholder=""
            isPrivate={false}
            channelType="Channel::Zalo"
            uiSettings={{ editor_message_key: 'enter' }}
            onChange={vi.fn()}
            onSend={onSend}
        />,
    );
    return { onSend, input: container.querySelector('.ProseMirror') as HTMLElement };
}

describe('Editor · Enter khi bộ gõ đang ghép dấu', () => {
    it('không gửi khi Enter chỉ để chốt từ đang ghép', () => {
        const { onSend, input } = renderEditor();

        fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
        fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

        expect(onSend).not.toHaveBeenCalled();
    });

    it('gửi đúng một lần khi Enter sau khi đã chốt từ', () => {
        const { onSend, input } = renderEditor();

        fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });

        expect(onSend).toHaveBeenCalledTimes(1);
    });
});
