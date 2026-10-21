import Button from 'dashboard/components-next/button/Button';

export type CallActionTone = 'neutral' | 'off' | 'end' | 'accept' | 'acceptAlt';

const TONE_PROPS: Record<CallActionTone, Record<string, boolean>> = {
    neutral: { slate: true, faded: true },
    off: { ruby: true, faded: true },
    end: { ruby: true, solid: true },
    accept: { teal: true, solid: true },
    acceptAlt: { teal: true, faded: true },
};

// Nút lớn của màn gọi: ô 64px bo 16, chữ ngắn ở dưới. Trên nền hình video thì nút thường thành
// kính mờ sáng, chữ trắng, để không lẫn vào hình.
export default function CallActionButton({
    icon,
    label,
    tone,
    isOnVideo = false,
    className = '',
    onClick,
}: {
    icon: string;
    label: string;
    tone: CallActionTone;
    isOnVideo?: boolean;
    className?: string;
    onClick: () => void;
}) {
    const videoClass = isOnVideo && tone === 'neutral' ? '!bg-white/15 !text-white hover:enabled:!bg-white/25 backdrop-blur-md' : '';

    return (
        <div className="flex flex-col items-center gap-2">
            <Button lg {...TONE_PROPS[tone]} icon={icon} title={label} className={`!size-16 !rounded-2xl [&>span]:!size-6 ${videoClass} ${className}`} onClick={onClick} />
            <span className={`text-xs ${isOnVideo ? 'text-white/90' : 'text-n-slate-11'}`}>{label}</span>
        </div>
    );
}
