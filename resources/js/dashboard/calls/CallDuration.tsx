import { useSyncExternalStore } from 'react';

const TICK_MS = 1000;

// Một bộ đếm giây dùng chung cho mọi nhãn thời lượng; chỉ chạy khi có nhãn đang hiện.
const listeners = new Set<() => void>();
let timer: number | null = null;
let now = Date.now();

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (timer === null) {
        now = Date.now();
        timer = window.setInterval(() => {
            now = Date.now();
            listeners.forEach(notify => notify());
        }, TICK_MS);
    }

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
            window.clearInterval(timer);
            timer = null;
        }
    };
}

const readNow = () => now;

function formatElapsed(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');

    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export default function CallDuration({ startedAt, className = '' }: { startedAt: string; className?: string }) {
    const current = useSyncExternalStore(subscribe, readNow, readNow);
    const elapsedSeconds = Math.max(0, Math.floor((current - Date.parse(startedAt)) / 1000));

    return <span className={`tabular-nums ${className}`}>{formatElapsed(elapsedSeconds)}</span>;
}
