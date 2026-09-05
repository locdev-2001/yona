import type { HTMLAttributes, ReactNode } from 'react';

// Port từ dashboard/components-next/label/Label.vue — `label` nhận chuỗi (chip
// chữ) hoặc nhãn thật (có màu + mô tả làm tooltip).
type LabelColor = 'slate' | 'amber' | 'teal' | 'ruby' | 'blue' | 'iris';

export interface LabelObject {
    title: string;
    description?: string | null;
    color?: string | null;
}

const COLOR_CLASSES: Record<LabelColor, string> = {
    slate: 'bg-n-label-color outline-n-label-border text-n-slate-12',
    amber: 'bg-n-amber-2 outline-n-amber-4 text-n-amber-11',
    teal: 'bg-n-teal-2 outline-n-teal-4 text-n-teal-11',
    ruby: 'bg-n-ruby-2 outline-n-ruby-4 text-n-ruby-11',
    blue: 'bg-n-blue-2 outline-n-blue-4 text-n-blue-11',
    iris: 'bg-n-iris-2 outline-n-iris-4 text-n-iris-11',
};

interface LabelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color' | 'title'> {
    label: string | LabelObject;
    compact?: boolean;
    color?: LabelColor;
    // Bản gốc lấy tooltip từ label.description; call-site chip chữ truyền thẳng.
    title?: string;
    icon?: ReactNode;
    action?: ReactNode;
}

export default function Label({
    label,
    compact = false,
    color = 'slate',
    title,
    icon,
    action,
    className = '',
    ...rest
}: LabelProps) {
    const isStringLabel = typeof label === 'string';
    const labelTitle = isStringLabel ? label : label.title;
    const labelDescription = title ?? (isStringLabel ? '' : (label.description ?? ''));
    const labelColor = isStringLabel ? null : label.color;

    return (
        <div
            {...rest}
            title={labelDescription}
            className={[
                'rounded-lg -outline-offset-1 outline outline-1 inline-flex items-center flex-shrink-0',
                COLOR_CLASSES[color],
                compact ? 'px-1.5 h-6 gap-1 rounded-md' : 'px-2.5 h-8 gap-1.5 rounded-lg',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {labelColor ? (
                <span
                    className={`rounded-sm flex-shrink-0 ${compact ? 'size-1.5' : 'size-2'}`}
                    style={{ background: labelColor }}
                />
            ) : (
                icon
            )}
            <span className={`whitespace-nowrap ${compact ? 'text-label-small' : 'text-label !font-420'}`}>
                {labelTitle}
            </span>
            {action}
        </div>
    );
}
