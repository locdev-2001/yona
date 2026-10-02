import DOMPurify from 'dompurify';

// Port từ dashboard/helper/emailQuoteExtractor.js @ v4.17.1.
const QUOTE_INDICATORS = [
    '.gmail_quote_container',
    '.gmail_quote',
    '.OutlookQuote',
    '.email-quote',
    '.quoted-text',
    '.quote',
    '[class*="quote"]',
    '[class*="Quote"]',
];

const BLOCKQUOTE_FALLBACK_SELECTOR = 'blockquote';

const QUOTE_PATTERNS = [/On .* wrote:/i, /Vào .* đã viết:/i, /-----Original Message-----/i, /Sent: /i, /From: /i];

const BLOCK_ELEMENTS = ['DIV', 'P', 'BLOCKQUOTE', 'SECTION'];

export class EmailQuoteExtractor {
    /** Bỏ phần trích dẫn khỏi HTML thư, trả về HTML đã dọn. */
    static extractQuotes(htmlContent: string): string {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);

        QUOTE_INDICATORS.forEach(selector => {
            tempDiv.querySelectorAll(selector).forEach(element => element.remove());
        });

        this.removeTrailingBlockquote(tempDiv);

        this.findTextNodeQuotes(tempDiv).forEach(element => element.remove());

        return tempDiv.innerHTML;
    }

    /** HTML thư có chứa trích dẫn hay không. */
    static hasQuotes(htmlContent: string): boolean {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);

        for (const selector of QUOTE_INDICATORS) {
            if (tempDiv.querySelector(selector)) return true;
        }

        if (this.findTrailingBlockquote(tempDiv)) return true;

        return this.findTextNodeQuotes(tempDiv).length > 0;
    }

    /** Các khối chứa text node khớp mẫu trích dẫn. */
    static findTextNodeQuotes(rootElement: Element): Element[] {
        const quoteBlocks: Element[] = [];
        const treeWalker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null);

        for (
            let currentNode = treeWalker.nextNode();
            currentNode !== null;
            currentNode = treeWalker.nextNode()
        ) {
            const isQuoteLike = QUOTE_PATTERNS.some(pattern => pattern.test(currentNode!.textContent ?? ''));

            if (isQuoteLike) {
                const parentBlock = this.findParentBlock(currentNode, rootElement);
                // Chỉ coi là trích dẫn khi dòng mở đầu là chữ đầu tiên của khối; khối có
                // nội dung đứng trước (thư bọc cả thân trong một <div>, chân thư có chữ
                // "From: ") mà bỏ đi là mất luôn phần thư mới.
                const startsWithQuoteHeader =
                    parentBlock?.textContent?.trimStart().startsWith((currentNode.textContent ?? '').trim()) ?? false;
                if (parentBlock && startsWithQuoteHeader && !quoteBlocks.includes(parentBlock)) {
                    quoteBlocks.push(parentBlock);
                }
            }
        }

        return quoteBlocks;
    }

    /** Khối cha gần nhất (DIV/P/BLOCKQUOTE/SECTION) của một node, không tính chính gốc. */
    static findParentBlock(node: Node, rootElement?: Element): Element | null {
        let current = node.parentElement;

        while (current && current !== rootElement) {
            if (BLOCK_ELEMENTS.includes(current.tagName)) return current;
            current = current.parentElement;
        }

        return null;
    }

    /** Bỏ blockquote dự phòng nếu nó là phần tử cấp một cuối cùng. */
    static removeTrailingBlockquote(rootElement: Element): void {
        this.findTrailingBlockquote(rootElement)?.remove();
    }

    /** Tìm blockquote dự phòng đứng cuối. */
    static findTrailingBlockquote(rootElement: Element): Element | null {
        const lastElement = rootElement.lastElementChild;
        if (lastElement?.matches?.(BLOCKQUOTE_FALLBACK_SELECTOR)) return lastElement;
        return null;
    }
}
