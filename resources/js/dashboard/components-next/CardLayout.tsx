import type { ReactNode } from 'react';

// Port từ dashboard/components-next/CardLayout.vue.
interface CardLayoutProps {
    layout?: 'col' | 'row';
    selectable?: boolean;
    className?: string;
    children: ReactNode;
    after?: ReactNode;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export default function CardLayout({
    layout = 'col',
    selectable = false,
    className = '',
    children,
    after,
    onClick,
    onMouseEnter,
    onMouseLeave,
}: CardLayoutProps) {
    return (
        <div
            className={`flex flex-col w-full group/cardLayout rounded-xl bg-n-surface-panel ${className}`.trim()}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div
                className={[
                    'flex w-full gap-3 py-5',
                    layout === 'col' ? 'flex-col' : 'flex-row justify-between items-center',
                    selectable ? 'px-10 py-6' : 'px-6',
                ].join(' ')}
                onClick={onClick}
            >
                {children}
            </div>
            {after}
        </div>
    );
}
