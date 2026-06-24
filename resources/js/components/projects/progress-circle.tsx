interface Props {
    progress: number; // 0-100
    size?: number;
}

export default function ProgressCircle({ progress, size = 48 }: Props) {
    const radius = (size - 6) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={5} className="stroke-muted" fill="none" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={5}
                    className="stroke-primary transition-all duration-300"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <span className="absolute text-xs font-semibold">{progress}%</span>
        </div>
    );
}
