import { useState } from 'react';

// `inbox`: chữ cái đầu trên nền đặc (hộp thư); `agent`: chữ tắt họ + tên trên nền ấm (nhân viên).
type AvatarTone = 'inbox' | 'agent';

const TONE_CLASS: Record<AvatarTone, string> = {
    inbox: 'bg-[var(--yona-chat-solid)] text-[var(--yona-chat-on-solid)]',
    agent: 'bg-[var(--yona-chat-avatar)] text-[var(--yona-chat-on-avatar)]',
};

const initialsOf = (name: string, tone: AvatarTone): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    if (tone === 'inbox' || words.length === 1) return words[0].charAt(0).toUpperCase();

    return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
};

interface WidgetAvatarProps {
    name: string;
    src?: string | null;
    size: number;
    tone: AvatarTone;
}

export default function WidgetAvatar({ name, src, size, tone }: WidgetAvatarProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const dimension = { width: size, height: size };

    if (src && failedSrc !== src) {
        return (
            <img
                className="object-cover rounded-full flex-shrink-0"
                style={dimension}
                src={src}
                alt=""
                onError={() => setFailedSrc(src)}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className={`flex items-center justify-center flex-shrink-0 rounded-full font-semibold ${TONE_CLASS[tone]}`}
            style={{ ...dimension, fontSize: Math.round(size * 0.38) }}
        >
            {initialsOf(name, tone)}
        </span>
    );
}
