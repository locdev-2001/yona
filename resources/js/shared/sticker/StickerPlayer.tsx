import { useEffect, useRef, useState } from 'react';

import type { LottiePlayerElement } from './thorvgLoader';

// Sticker động dùng chung cho dashboard và widget. Poster hiện ngay; chỉ khi sticker
// vào khung nhìn mới nạp ThorVG (chunk riêng) và phát lặp, ra khỏi khung thì dừng.
// Mọi lỗi nạp/phát đều giữ nguyên poster.

export interface StickerPlayerProps {
    posterUrl: string;
    animationUrl?: string | null;
    alt: string;
    className?: string;
    onPosterError?: () => void;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function canAnimate(): boolean {
    return (
        typeof WebAssembly === 'object' &&
        typeof IntersectionObserver === 'function' &&
        !window.matchMedia?.(REDUCED_MOTION_QUERY).matches
    );
}

// ThorVG chỉ dọn được player đã khởi tạo xong (đã báo 'load' hoặc 'error'); trước đó
// destroy() không làm gì mà player vẫn tự nạp tiếp. Nên gỡ khỏi DOM ngay, còn destroy
// thì hoãn tới lúc player tự báo xong.
const PLAYER_SETTLE_EVENTS = ['load', 'error'] as const;
const settledPlayers = new WeakSet<LottiePlayerElement>();

function onPlayerSettled(player: LottiePlayerElement, callback: () => void): void {
    for (const event of PLAYER_SETTLE_EVENTS) player.addEventListener(event, callback, { once: true });
}

function disposePlayer(player: LottiePlayerElement): void {
    player.remove();
    if (settledPlayers.has(player)) player.destroy();
    else onPlayerSettled(player, () => player.destroy());
}

export default function StickerPlayer({ posterUrl, animationUrl, alt, className = '', onPosterError }: StickerPlayerProps) {
    const boxRef = useRef<HTMLSpanElement>(null);
    const playerHostRef = useRef<HTMLSpanElement>(null);
    const [isPlayerShown, setIsPlayerShown] = useState(false);

    useEffect(() => {
        const box = boxRef.current;
        const playerHost = playerHostRef.current;
        if (!box || !playerHost || !animationUrl || !canAnimate()) return;

        let player: LottiePlayerElement | null = null;
        let isLoadRequested = false;
        let isDisposed = false;

        const dropPlayer = () => {
            if (player) disposePlayer(player);
            player = null;
            setIsPlayerShown(false);
        };

        const mountPlayer = () => {
            isLoadRequested = true;
            import('./thorvgLoader')
                .then(({ createLottiePlayer }) => createLottiePlayer(animationUrl))
                .then(created => {
                    if (isDisposed) return;
                    created.className = 'block size-full';
                    onPlayerSettled(created, () => settledPlayers.add(created));
                    created.addEventListener('load', () => setIsPlayerShown(true), { once: true });
                    created.addEventListener('error', dropPlayer, { once: true });
                    player = created;
                    playerHost.appendChild(created);
                })
                .catch(() => {
                    isLoadRequested = false;
                });
        };

        const observer = new IntersectionObserver(entries => {
            const isVisible = entries.some(entry => entry.isIntersecting);
            if (!isVisible) {
                player?.pause();
                return;
            }
            if (player) player.play();
            else if (!isLoadRequested) mountPlayer();
        });
        observer.observe(box);

        return () => {
            isDisposed = true;
            observer.disconnect();
            dropPlayer();
        };
    }, [animationUrl]);

    return (
        <span ref={boxRef} className={`relative inline-block ${className}`} data-sticker-player>
            <img
                src={posterUrl}
                alt={alt}
                loading="lazy"
                draggable={false}
                className={`size-full object-contain ${isPlayerShown ? 'opacity-0' : ''}`}
                onError={onPosterError}
            />
            <span ref={playerHostRef} aria-hidden="true" className="absolute inset-0 pointer-events-none" />
        </span>
    );
}
