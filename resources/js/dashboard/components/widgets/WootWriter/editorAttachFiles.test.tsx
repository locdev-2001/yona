import { act, render } from '@testing-library/react';
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

function renderEditor(props: { disabled?: boolean; onAttachFiles?: (files: File[]) => void; onChange?: () => void }) {
    const { container } = render(
        <Editor
            value=""
            editorId="reply-4-REPLY"
            placeholder=""
            channelType="Channel::Zalo"
            uiSettings={{}}
            onChange={props.onChange ?? vi.fn()}
            disabled={props.disabled}
            onAttachFiles={props.onAttachFiles}
        />,
    );

    return container.querySelector('.ProseMirror') as HTMLElement;
}

function pasteInto(target: HTMLElement, files: File[], text = ''): Event {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
        value: {
            files,
            types: text ? ['text/plain'] : ['Files'],
            getData: (format: string) => (format === 'text/plain' ? text : ''),
        },
    });
    act(() => {
        target.dispatchEvent(event);
    });

    return event;
}

const screenshot = () => new File(['png-bytes'], 'image.png', { type: 'image/png' });

describe('Editor · dán tệp vào ô soạn', () => {
    it('ảnh dán vào thành tệp đính kèm, không chèn gì vào chữ', () => {
        const onAttachFiles = vi.fn();
        const onChange = vi.fn();
        const editor = renderEditor({ onAttachFiles, onChange });
        const image = screenshot();

        const event = pasteInto(editor, [image], 'image.png');

        expect(onAttachFiles).toHaveBeenCalledWith([image]);
        expect(event.defaultPrevented).toBe(true);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('dán chữ thường thì không gọi đính kèm', () => {
        const onAttachFiles = vi.fn();
        const editor = renderEditor({ onAttachFiles });

        pasteInto(editor, [], 'Dạ shop gửi báo giá ạ');

        expect(onAttachFiles).not.toHaveBeenCalled();
    });

    it('ô soạn đang khoá thì không nhận tệp dán', () => {
        const onAttachFiles = vi.fn();
        const editor = renderEditor({ onAttachFiles, disabled: true });

        pasteInto(editor, [screenshot()]);

        expect(onAttachFiles).not.toHaveBeenCalled();
    });
});
