import { highlightSegments } from 'shared/helpers/searchFold';

// Tin khớp xếp mới trước như máy chủ trả: vị trí 0 là tin mới nhất. ↑ đi về tin cũ
// hơn, ↓ về tin mới hơn; tới đầu hay cuối thì đứng yên, không vòng lại.
export type MatchDirection = 'older' | 'newer';

export const SEARCH_DEBOUNCE_MS = 300;

// Tên vùng tô của CSS Custom Highlight API — khớp với `::highlight(...)` trong app.css.
export const CONVERSATION_SEARCH_HIGHLIGHT = 'conversation-search';

export function stepMatchIndex(index: number, total: number, direction: MatchDirection): number {
    if (total === 0) return -1;

    const next = direction === 'older' ? index + 1 : index - 1;

    return Math.min(Math.max(next, 0), total - 1);
}

export function canStep(index: number, total: number, direction: MatchDirection): boolean {
    return total > 0 && stepMatchIndex(index, total, direction) !== index;
}

// "3/12": tin thứ 3 tính từ mới nhất trong 12 tin khớp.
export function matchCounterLabel(index: number, total: number): string {
    return total === 0 ? '0/0' : `${index + 1}/${total}`;
}

function messageTextRoots(messageId: number): Element[] {
    const row = document.getElementById(`message${messageId}`);
    if (!row) return [];

    const bubbles = row.querySelectorAll('.prose-bubble');

    return bubbles.length ? Array.from(bubbles) : [row];
}

// Đoạn khớp từ khoá trong chữ của tin, theo đúng luật tô không dấu của ô tìm kiếm.
export function matchRangesIn(root: Element, query: string): Range[] {
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let offset = 0;

        for (const segment of highlightSegments(node.textContent ?? '', query)) {
            if (segment.match) {
                const range = document.createRange();
                range.setStart(node, offset);
                range.setEnd(node, offset + segment.text.length);
                ranges.push(range);
            }
            offset += segment.text.length;
        }
    }

    return ranges;
}

interface HighlightRegistry {
    set: (name: string, highlight: unknown) => void;
    delete: (name: string) => void;
}

function highlightRegistry(): HighlightRegistry | null {
    const registry = (globalThis.CSS as unknown as { highlights?: HighlightRegistry } | undefined)?.highlights;

    return registry && typeof (globalThis as { Highlight?: unknown }).Highlight === 'function' ? registry : null;
}

// Tô từ khoá trong các tin khớp đang hiện trên khung chat mà không đụng vào DOM
// của React. Trình duyệt chưa có Highlight API thì bỏ qua — tin vẫn được cuộn tới
// và nháy nền.
export function paintConversationSearch(messageIds: number[], query: string): void {
    const registry = highlightRegistry();
    if (!registry) return;

    const ranges = messageIds.flatMap(id => messageTextRoots(id).flatMap(root => matchRangesIn(root, query)));
    const HighlightClass = (globalThis as unknown as { Highlight: new (...ranges: Range[]) => unknown }).Highlight;

    registry.set(CONVERSATION_SEARCH_HIGHLIGHT, new HighlightClass(...ranges));
}

export function clearConversationSearch(): void {
    highlightRegistry()?.delete(CONVERSATION_SEARCH_HIGHLIGHT);
}
