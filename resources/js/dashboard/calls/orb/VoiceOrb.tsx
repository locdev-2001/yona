import { useEffect, useRef } from 'react';
import { LineOrb } from './lineOrb';
import type { LineOrbMode } from './lineOrb';

export type VoiceOrbMode = LineOrbMode;

export interface VoiceOrbProps {
    colors: [string, string];
    isDark: boolean;
    mode: VoiceOrbMode;
    readInputLevel: () => number;
    readOutputLevel: () => number;
}

// Vỏ React của quả cầu sợi sáng. Chỉ nạp qua CallOrb (tải lười) để trang khác không tải three.js.
export default function VoiceOrb({ colors, isDark, mode, readInputLevel, readOutputLevel }: VoiceOrbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const orbRef = useRef<LineOrb | null>(null);
    const readersRef = useRef({ readInputLevel, readOutputLevel });
    readersRef.current = { readInputLevel, readOutputLevel };

    useEffect(() => {
        if (!canvasRef.current) return;
        const orb = new LineOrb(canvasRef.current, {
            colors,
            isDark,
            readInputLevel: () => readersRef.current.readInputLevel(),
            readOutputLevel: () => readersRef.current.readOutputLevel(),
        });
        orbRef.current = orb;
        orb.start(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        return () => {
            orb.dispose();
            orbRef.current = null;
        };
        // Màu, nền và trạng thái đổi về sau đi qua update(), không dựng lại WebGL.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        orbRef.current?.update({ colors, isDark }, mode);
    }, [colors, isDark, mode]);

    return <canvas ref={canvasRef} className="size-full" />;
}
