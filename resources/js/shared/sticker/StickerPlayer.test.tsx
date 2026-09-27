import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StickerPlayer from './StickerPlayer';

const POSTER_URL = 'https://cdn.yona.test/stickers/ab/poster.webp';
const ANIMATION_URL = 'https://cdn.yona.test/stickers/ab/anim.json';

interface FakePlayer extends HTMLElement {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
}

const loader = vi.hoisted(() => ({ createLottiePlayer: vi.fn() }));

vi.mock('./thorvgLoader', () => ({ createLottiePlayer: loader.createLottiePlayer }));

class FakeIntersectionObserver {
    static instances: FakeIntersectionObserver[] = [];
    readonly targets: Element[] = [];
    disconnected = false;

    constructor(private readonly callback: IntersectionObserverCallback) {
        FakeIntersectionObserver.instances.push(this);
    }

    observe(target: Element) {
        this.targets.push(target);
    }

    unobserve() {}

    disconnect() {
        this.disconnected = true;
    }

    takeRecords() {
        return [];
    }

    trigger(isIntersecting: boolean) {
        const entries = this.targets.map(target => ({ isIntersecting, target }) as IntersectionObserverEntry);
        this.callback(entries, this as unknown as IntersectionObserver);
    }
}

function fakePlayer(): FakePlayer {
    const player = document.createElement('lottie-player') as FakePlayer;
    player.play = vi.fn();
    player.pause = vi.fn();
    player.destroy = vi.fn();
    return player;
}

function mockReducedMotion(isReduced: boolean) {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: isReduced && query.includes('reduce'), media: query }) as MediaQueryList),
    );
}

const observer = () => FakeIntersectionObserver.instances[0];

async function scrollIntoView() {
    await act(async () => observer().trigger(true));
}

const poster = (container: HTMLElement) => container.querySelector('img');

describe('StickerPlayer', () => {
    let player: FakePlayer;

    beforeEach(() => {
        FakeIntersectionObserver.instances = [];
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
        mockReducedMotion(false);
        player = fakePlayer();
        loader.createLottiePlayer.mockReset().mockReturnValue(player);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('hiện poster ngay, chưa vào khung thì không nạp ThorVG', () => {
        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="Mèo vẫy" />);

        expect(poster(container)?.getAttribute('src')).toBe(POSTER_URL);
        expect(poster(container)?.getAttribute('alt')).toBe('Mèo vẫy');
        expect(loader.createLottiePlayer).not.toHaveBeenCalled();
    });

    it('vào khung thì nạp player với URL bản động và gắn vào sticker', async () => {
        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);

        await scrollIntoView();

        await waitFor(() => expect(loader.createLottiePlayer).toHaveBeenCalledWith(ANIMATION_URL));
        expect(container.querySelector('lottie-player')).toBe(player);
    });

    it('poster chỉ ẩn khi player đã vẽ khung đầu, vẫn giữ trong DOM', async () => {
        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);
        await scrollIntoView();
        await waitFor(() => expect(container.querySelector('lottie-player')).not.toBeNull());

        expect(poster(container)?.className).not.toContain('opacity-0');

        await act(async () => player.dispatchEvent(new CustomEvent('load')));

        expect(poster(container)?.className).toContain('opacity-0');
    });

    it('ra khỏi khung thì dừng, vào lại thì phát tiếp mà không nạp lại', async () => {
        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);
        await scrollIntoView();
        await waitFor(() => expect(container.querySelector('lottie-player')).not.toBeNull());

        await act(async () => observer().trigger(false));
        expect(player.pause).toHaveBeenCalledTimes(1);

        await scrollIntoView();
        expect(player.play).toHaveBeenCalledTimes(1);
        expect(loader.createLottiePlayer).toHaveBeenCalledTimes(1);
    });

    it('unmount thì huỷ player đã khởi tạo và ngắt observer', async () => {
        const { container, unmount } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);
        await scrollIntoView();
        await waitFor(() => expect(container.querySelector('lottie-player')).not.toBeNull());
        await act(async () => player.dispatchEvent(new CustomEvent('load')));

        unmount();

        expect(player.destroy).toHaveBeenCalledTimes(1);
        expect(player.isConnected).toBe(false);
        expect(observer().disconnected).toBe(true);
    });

    // ThorVG: destroy() trước khi player khởi tạo xong không làm gì, player vẫn tự nạp tiếp.
    it.each(['load', 'error'])(
        'unmount khi player chưa khởi tạo xong thì gỡ ngay, hoãn destroy tới lúc player báo %s',
        async settleEvent => {
            const { container, unmount } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);
            await scrollIntoView();
            await waitFor(() => expect(container.querySelector('lottie-player')).not.toBeNull());

            unmount();

            expect(player.isConnected).toBe(false);
            expect(player.destroy).not.toHaveBeenCalled();

            player.dispatchEvent(new CustomEvent(settleEvent));

            expect(player.destroy).toHaveBeenCalledTimes(1);
        },
    );

    it('người dùng bật giảm chuyển động thì chỉ có poster, không quan sát, không nạp', async () => {
        mockReducedMotion(true);

        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);

        expect(FakeIntersectionObserver.instances).toHaveLength(0);
        expect(poster(container)?.getAttribute('src')).toBe(POSTER_URL);
        expect(loader.createLottiePlayer).not.toHaveBeenCalled();
    });

    it('không có bản động thì chỉ hiện poster', () => {
        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={null} alt="" />);

        expect(FakeIntersectionObserver.instances).toHaveLength(0);
        expect(poster(container)?.getAttribute('src')).toBe(POSTER_URL);
    });

    it('trình duyệt không có WebAssembly thì chỉ hiện poster', () => {
        vi.stubGlobal('WebAssembly', undefined);

        render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);

        expect(FakeIntersectionObserver.instances).toHaveLength(0);
    });

    it('nạp ThorVG lỗi thì giữ poster, không ném lỗi', async () => {
        loader.createLottiePlayer.mockImplementation(() => {
            throw new Error('thorvg_unavailable');
        });

        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);
        await scrollIntoView();

        await waitFor(() => expect(loader.createLottiePlayer).toHaveBeenCalledTimes(1));
        expect(container.querySelector('lottie-player')).toBeNull();
        expect(poster(container)?.getAttribute('src')).toBe(POSTER_URL);
        expect(poster(container)?.className).not.toContain('opacity-0');
    });

    it('player báo lỗi khi phát thì gỡ player và hiện lại poster', async () => {
        const { container } = render(<StickerPlayer posterUrl={POSTER_URL} animationUrl={ANIMATION_URL} alt="" />);
        await scrollIntoView();
        await waitFor(() => expect(container.querySelector('lottie-player')).not.toBeNull());
        await act(async () => player.dispatchEvent(new CustomEvent('load')));

        await act(async () => player.dispatchEvent(new CustomEvent('error')));

        expect(container.querySelector('lottie-player')).toBeNull();
        expect(player.destroy).toHaveBeenCalledTimes(1);
        expect(poster(container)?.className).not.toContain('opacity-0');
    });
});
