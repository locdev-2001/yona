import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StickerImage from './StickerImage';
import { MAX_ANIMATED_STICKERS } from './stickerAnimationBudget';

type VisibilityCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let reportVisibility: VisibilityCallback = () => undefined;
const observed = new Set<Element>();
let reducedMotion = false;
let reducedMotionChange: (() => void) | null = null;

class FakeIntersectionObserver {
    constructor(callback: VisibilityCallback) {
        reportVisibility = callback;
    }
    observe = (element: Element) => observed.add(element);
    unobserve = (element: Element) => observed.delete(element);
    disconnect = () => observed.clear();
}

function setVisible(images: HTMLElement[], isIntersecting: boolean) {
    act(() => reportVisibility(images.map(target => ({ target, isIntersecting }))));
}

function renderStickers(count: number) {
    render(
        <>
            {Array.from({ length: count }, (_, index) => (
                <StickerImage key={index} alt={`s${index}`} src={`/s/${index}/sticker.webp`} staticSrc={`/s/${index}/static.png`} />
            ))}
        </>,
    );

    return Array.from({ length: count }, (_, index) => screen.getByAltText(`s${index}`));
}

const animatedCount = (images: HTMLElement[]) => images.filter(image => image.getAttribute('src')?.endsWith('.webp')).length;

beforeEach(() => {
    reducedMotion = false;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('matchMedia', (query: string) => ({
        media: query,
        get matches() {
            return reducedMotion;
        },
        addEventListener: (_event: string, listener: () => void) => {
            reducedMotionChange = listener;
        },
        removeEventListener: () => {
            reducedMotionChange = null;
        },
    }));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('StickerImage — giới hạn sticker động cùng chạy', () => {
    it('ngoài khung nhìn hiện ảnh tĩnh, vào khung nhìn thì chạy', () => {
        const [image] = renderStickers(1);

        expect(image).toHaveAttribute('src', '/s/0/static.png');

        setVisible([image], true);
        expect(image).toHaveAttribute('src', '/s/0/sticker.webp');

        setVisible([image], false);
        expect(image).toHaveAttribute('src', '/s/0/static.png');
    });

    it(`chỉ ${MAX_ANIMATED_STICKERS} sticker trong khung nhìn được chạy, sticker rời khung nhìn nhường lượt`, () => {
        const images = renderStickers(MAX_ANIMATED_STICKERS + 2);

        setVisible(images, true);
        expect(animatedCount(images)).toBe(MAX_ANIMATED_STICKERS);
        expect(images[MAX_ANIMATED_STICKERS]).toHaveAttribute('src', `/s/${MAX_ANIMATED_STICKERS}/static.png`);

        setVisible([images[0]], false);
        expect(animatedCount(images)).toBe(MAX_ANIMATED_STICKERS);
        expect(images[0]).toHaveAttribute('src', '/s/0/static.png');
        expect(images[MAX_ANIMATED_STICKERS]).toHaveAttribute('src', `/s/${MAX_ANIMATED_STICKERS}/sticker.webp`);
    });

    it('người dùng bật giảm chuyển động thì mọi sticker đứng yên', () => {
        const images = renderStickers(2);
        setVisible(images, true);
        expect(animatedCount(images)).toBe(2);

        reducedMotion = true;
        act(() => reducedMotionChange?.());

        expect(animatedCount(images)).toBe(0);
    });

    it('sticker không có ảnh tĩnh riêng hiện nguyên ảnh, không chiếm lượt', () => {
        render(<StickerImage alt="zalo" src="https://cdn.zalo.test/1.webp" />);

        expect(screen.getByAltText('zalo')).toHaveAttribute('src', 'https://cdn.zalo.test/1.webp');
        expect(observed.size).toBe(0);
    });
});
