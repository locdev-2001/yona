import { useEffect, useState } from 'react';

const TICK_MS = 1000;

function formatElapsed(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, '0');

    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export default function CallDuration({ startedAt, className = '' }: { startedAt: string; className?: string }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
        return () => window.clearInterval(timer);
    }, []);

    const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));

    return <span className={`tabular-nums ${className}`}>{formatElapsed(elapsedSeconds)}</span>;
}
