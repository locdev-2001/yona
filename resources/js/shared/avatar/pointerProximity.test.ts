import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NEAR_POINTER_RADIUS_PX, watchPointerProximity } from './pointerProximity';

function elementAt(left: number, top: number, size = 40): Element {
    const element = document.createElement('span');
    element.getBoundingClientRect = () => new DOMRect(left, top, size, size);
    return element;
}

function movePointer(x: number, y: number): void {
    window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: x, clientY: y }));
}

describe('theo dõi con trỏ ở gần avatar', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: fine)' }) as MediaQueryList);
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            callback(0);
            return 0;
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('báo gần khi con trỏ vào trong bán kính, báo xa khi ra ngoài', () => {
        const onChange = vi.fn();
        const stop = watchPointerProximity(elementAt(100, 100), onChange);

        movePointer(140 + NEAR_POINTER_RADIUS_PX - 1, 120);
        movePointer(140 + NEAR_POINTER_RADIUS_PX + 50, 120);

        expect(onChange.mock.calls).toEqual([[true], [false]]);
        stop();
    });

    it('chỉ báo khi trạng thái đổi, không báo lại mỗi lần con trỏ nhích', () => {
        const onChange = vi.fn();
        const stop = watchPointerProximity(elementAt(100, 100), onChange);

        movePointer(120, 120);
        movePointer(125, 125);

        expect(onChange).toHaveBeenCalledTimes(1);
        stop();
    });

    it('thiết bị cảm ứng không theo dõi', () => {
        vi.stubGlobal('matchMedia', () => ({ matches: false }) as MediaQueryList);
        const onChange = vi.fn();
        const stop = watchPointerProximity(elementAt(100, 100), onChange);

        movePointer(120, 120);

        expect(onChange).not.toHaveBeenCalled();
        stop();
    });
});
