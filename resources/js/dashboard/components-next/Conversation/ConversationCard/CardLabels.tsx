import { useEffect, useRef, useState } from 'react';

// Port từ components-next/Conversation/ConversationCard/CardLabels.vue —
// số nhãn hiển thị tính theo bề rộng trung bình của nhãn.
const WIDTH_CONFIG = {
    DEFAULT_WIDTH: 80,
    CHAR_WIDTH: { SHORT: 8, LONG: 6 },
    BASE_WIDTH: 12,
    THRESHOLD: 5,
} as const;

export interface AccountLabel {
    id: number;
    title: string;
    color: string;
}

interface CardLabelsProps {
    conversationLabels: string[];
    accountLabels: AccountLabel[];
}

const labelWidth = (title = '') => {
    const charWidth = title.length > WIDTH_CONFIG.THRESHOLD ? WIDTH_CONFIG.CHAR_WIDTH.LONG : WIDTH_CONFIG.CHAR_WIDTH.SHORT;

    return title.length * charWidth + WIDTH_CONFIG.BASE_WIDTH;
};

const averageWidth = (labels: AccountLabel[]) =>
    labels.length
        ? labels.reduce((sum, label) => sum + labelWidth(label.title), 0) / labels.length
        : WIDTH_CONFIG.DEFAULT_WIDTH;

export default function CardLabels({ conversationLabels, accountLabels }: CardLabelsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [maxLabels, setMaxLabels] = useState(1);

    const labelSet = new Set(conversationLabels);
    const activeLabels = (accountLabels ?? []).filter(({ title }) => labelSet.has(title));

    // v-resize của bản gốc.
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return undefined;

        const update = () => setMaxLabels(Math.max(1, Math.floor(element.offsetWidth / averageWidth(activeLabels))));
        update();

        const observer = new ResizeObserver(update);
        observer.observe(element);

        return () => observer.disconnect();
    });

    const visibleLabels = activeLabels.slice(0, maxLabels);

    return (
        <div ref={containerRef} className="flex items-center gap-2.5 w-full min-w-0 h-6 overflow-hidden">
            {visibleLabels.map((label, index) => (
                <div
                    key={label.id}
                    className={`flex items-center gap-1.5 min-w-0 ${
                        index !== visibleLabels.length - 1 ? 'flex-shrink-0 text-ellipsis' : 'flex-shrink'
                    }`}
                >
                    <div style={{ backgroundColor: label.color }} className="size-1.5 rounded-full flex-shrink-0" />
                    <span
                        className={`text-sm text-n-slate-10 whitespace-nowrap ${
                            index === visibleLabels.length - 1 ? 'truncate' : ''
                        }`.trim()}
                    >
                        {label.title}
                    </span>
                </div>
            ))}
        </div>
    );
}
