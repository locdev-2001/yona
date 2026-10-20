import { lazy, Suspense, useEffect, useState } from 'react';
import type { VoiceOrbMode } from './orb/VoiceOrb';

// three.js chỉ tải khi màn gọi lớn mở ra.
// Tải trước ngay khi có cuộc gọi (đổ chuông, bấm gọi) để màn lớn mở ra là có quả cầu, không nháy bản tĩnh.
export const loadVoiceOrb = () => import('./orb/VoiceOrb');

const VoiceOrb = lazy(loadVoiceOrb);

interface OrbTheme {
    colors: [string, string];
    isDark: boolean;
}

function themeColor(name: string, fallback: string): string {
    const channels = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/);
    return channels.length === 3 ? `rgb(${channels.join(', ')})` : fallback;
}

const readTheme = (): OrbTheme => ({
    colors: [themeColor('--teal-11', 'rgb(13, 155, 138)'), themeColor('--teal-9', 'rgb(18, 165, 148)')],
    isDark: document.documentElement.classList.contains('dark'),
});

function supportsWebGl(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

function useOrbTheme(): OrbTheme {
    const [theme, setTheme] = useState(readTheme);
    useEffect(() => {
        const observer = new MutationObserver(() => setTheme(readTheme()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    return theme;
}

// Quả cầu âm thanh của màn gọi, màu teal của hệ thống, theo nền sáng/tối. Lớp giao diện chỉ đưa
// vào trạng thái và hai hàm đọc mức âm 0..1, không biết âm đến từ đâu. Không có WebGL thì hiện
// một quầng tĩnh.
export default function CallOrb({
    mode,
    readSelfLevel,
    readPeerLevel,
    className = '',
}: {
    mode: VoiceOrbMode;
    readSelfLevel: () => number;
    readPeerLevel: () => number;
    className?: string;
}) {
    const [canRender] = useState(supportsWebGl);
    const theme = useOrbTheme();
    const stillOrb = <div className="size-[70%] rounded-full bg-n-teal-9/15" />;

    return (
        <div className={`relative flex items-center justify-center ${className}`} aria-hidden="true">
            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgb(var(--teal-9)/0.14),transparent)]" />
            {canRender ? (
                <Suspense fallback={stillOrb}>
                    <div className="absolute inset-0">
                        <VoiceOrb colors={theme.colors} isDark={theme.isDark} mode={mode} readInputLevel={readSelfLevel} readOutputLevel={readPeerLevel} />
                    </div>
                </Suspense>
            ) : (
                stillOrb
            )}
        </div>
    );
}
