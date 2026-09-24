import { afterEach, describe, expect, it } from 'vitest';

import { REVEAL_MARGIN_PX, revealHorizontally } from './revealHorizontally';

interface Box {
    left: number;
    right: number;
}

function withBox(element: HTMLElement, { left, right }: Box): void {
    element.getBoundingClientRect = () => ({ left, right, width: right - left, top: 0, bottom: 32, height: 32, x: left, y: 0, toJSON: () => ({}) });
}

function withOverflow(element: HTMLElement, scrollWidth: number, clientWidth: number): void {
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
}

// Khung ngoài overflow-hidden (như SECTION của trang tìm kiếm) > khung cuộn 343px > thanh tab 610px.
function buildTabStrip(scrollerOverflow = 'auto') {
    const page = document.createElement('section');
    page.style.overflowX = 'hidden';
    const scroller = document.createElement('div');
    scroller.style.overflowX = scrollerOverflow;
    const strip = document.createElement('div');
    const tab = document.createElement('button');

    strip.append(tab);
    scroller.append(strip);
    page.append(scroller);
    document.body.append(page);
    withBox(scroller, { left: 16, right: 359 });
    withOverflow(scroller, 610, 343);

    return { page, scroller, tab };
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('revealHorizontally', () => {
    it('cuộn khung sang phải vừa đủ để thấy trọn tab nằm ngoài mép phải', () => {
        const { page, scroller, tab } = buildTabStrip();
        withBox(tab, { left: 452, right: 540 });

        revealHorizontally(tab);

        expect(scroller.scrollLeft).toBe(540 - (359 - REVEAL_MARGIN_PX));
        expect(page.scrollLeft).toBe(0);
    });

    it('cuộn ngược lại khi tab nằm ngoài mép trái', () => {
        const { scroller, tab } = buildTabStrip();
        scroller.scrollLeft = 200;
        withBox(tab, { left: -100, right: 0 });

        revealHorizontally(tab);

        expect(scroller.scrollLeft).toBe(200 - (16 + REVEAL_MARGIN_PX + 100));
    });

    it('không cuộn khi tab đã nằm trong tầm nhìn', () => {
        const { scroller, tab } = buildTabStrip();
        withBox(tab, { left: 120, right: 200 });

        revealHorizontally(tab);

        expect(scroller.scrollLeft).toBe(0);
    });

    it('không đụng tới khung overflow-hidden, cũng không tới khung không tràn', () => {
        const hidden = buildTabStrip('hidden');
        withBox(hidden.tab, { left: 452, right: 540 });
        revealHorizontally(hidden.tab);
        expect(hidden.scroller.scrollLeft).toBe(0);
        expect(hidden.page.scrollLeft).toBe(0);

        const fitting = buildTabStrip();
        withOverflow(fitting.scroller, 343, 343);
        withBox(fitting.tab, { left: 452, right: 540 });
        revealHorizontally(fitting.tab);
        expect(fitting.scroller.scrollLeft).toBe(0);
    });
});
