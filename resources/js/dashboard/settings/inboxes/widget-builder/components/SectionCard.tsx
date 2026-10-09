import type { ReactNode } from 'react';

interface SectionCardProps {
    id?: string;
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

// Thẻ trắng bo góc dùng cho mọi mục ở cột giữa (Giao diện, Trang chủ, Kênh
// khác…) — nền panel và viền nhẹ quanh thẻ. `id` là neo mà
// nav trái cuộn tới (xem BuilderNav + WidgetBuilderPage).
export default function SectionCard({ id, title, description = '', action, children, className = '' }: SectionCardProps) {
    return (
        <section
            id={id}
            className={`panel-surface rounded-2xl p-5 scroll-mt-4 ${className}`}
        >
            <header className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-heading-2 text-n-slate-12 m-0">{title}</h2>
                    {description ? <p className="mt-0.5 text-body-main text-n-slate-11">{description}</p> : null}
                </div>
                {action}
            </header>
            <div className="flex flex-col gap-4">{children}</div>
        </section>
    );
}
