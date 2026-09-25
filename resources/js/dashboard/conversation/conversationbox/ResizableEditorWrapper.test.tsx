import { act, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { COMPOSER_AUTO_GROW_MAX_HEIGHT } from '../composerHeight';
import ResizableEditorWrapper, { measureContentHeight } from './ResizableEditorWrapper';

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({ uiSettings: {}, updateUISettings: vi.fn() }),
}));

// Số đo thật của ô soạn: một dòng cao 23px, đoạn văn có margin 10px trên (khối
// đầu) và 10px dưới (khối cuối). jsdom không dàn trang nên tự dựng toạ độ.
const LINE_HEIGHT = 23;
const PARAGRAPH_MARGIN = 10;

function paragraphBody(lineCount: number): HTMLElement {
    const body = document.createElement('div');
    body.className = 'resizable-editor-body';
    for (let lineIndex = 0; lineIndex < Math.max(lineCount, 1); lineIndex += 1) {
        const paragraph = document.createElement('p');
        paragraph.style.marginTop = lineIndex === 0 ? `${PARAGRAPH_MARGIN}px` : '0px';
        paragraph.style.marginBottom = `${PARAGRAPH_MARGIN}px`;
        const top = PARAGRAPH_MARGIN + lineIndex * (LINE_HEIGHT + PARAGRAPH_MARGIN);
        paragraph.getBoundingClientRect = () => ({ top, bottom: top + LINE_HEIGHT }) as DOMRect;
        body.appendChild(paragraph);
    }
    return body;
}

// scrollHeight thật của thân editor = nội dung + margin ngoài; clientHeight = chiều cao áp.
const scrollHeightOf = (lineCount: number) =>
    lineCount * LINE_HEIGHT + (lineCount - 1) * PARAGRAPH_MARGIN + PARAGRAPH_MARGIN * 2;

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

afterEach(() => vi.useRealTimers());

async function renderComposer(lineCount: number) {
    const { container } = render(
        <ResizableEditorWrapper containerHeight={900}>
            <div data-testid="editor-host" />
        </ResizableEditorWrapper>,
    );
    const wrapper = container.querySelector('.resizable-editor-wrapper') as HTMLElement;
    await act(async () => {
        wrapper.querySelector('[data-testid="editor-host"]')!.appendChild(paragraphBody(lineCount));
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
    });
    return {
        clientHeight: parseFloat(wrapper.style.getPropertyValue('--editor-height')),
        overflow: wrapper.dataset.editorOverflow,
    };
}

describe('ô soạn trả lời không hiện thanh cuộn khi chưa chạm trần', () => {
    it('đo cả margin của khối đầu và khối cuối', () => {
        expect(measureContentHeight(paragraphBody(1))).toBe(scrollHeightOf(1));
        expect(measureContentHeight(paragraphBody(3))).toBe(scrollHeightOf(3));
    });

    it.each([
        ['rỗng', 0],
        ['một dòng', 1],
        ['bốn dòng', 4],
    ])('%s: scrollHeight ≤ clientHeight, không cho cuộn', async (_label, lineCount) => {
        const { clientHeight, overflow } = await renderComposer(lineCount);

        expect(scrollHeightOf(Math.max(lineCount, 1))).toBeLessThanOrEqual(clientHeight);
        expect(overflow).toBe('hidden');
    });

    it('nhiều dòng vượt trần 200px mới cho cuộn', async () => {
        const { clientHeight, overflow } = await renderComposer(10);

        expect(clientHeight).toBe(COMPOSER_AUTO_GROW_MAX_HEIGHT);
        expect(scrollHeightOf(10)).toBeGreaterThan(clientHeight);
        expect(overflow).toBe('auto');
    });
});
