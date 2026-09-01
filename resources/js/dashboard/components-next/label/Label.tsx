import type { ReactNode } from 'react';

// Port từ dashboard/components-next/label/Label.vue (nhánh label dạng object
// có màu dùng cho labels thật — vào B7; B1 chỉ cần chip chữ).
type LabelColor = 'slate' | 'amber' | 'teal' | 'ruby' | 'blue' | 'iris';

const COLOR_CLASSES: Record<LabelColor, string> = {
    slate: 'bg-n-label-color outline-n-label-border text-n-slate-12',
    amber: 'bg-n-amber-2 outline-n-amber-4 text-n-amber-11',
    teal: 'bg-n-teal-2 outline-n-teal-4 text-n-teal-11',
    ruby: 'bg-n-ruby-2 outline-n-ruby-4 text-n-ruby-11',
    blue: 'bg-n-blue-2 outline-n-blue-4 text-n-blue-11',
    iris: 'bg-n-iris-2 outline-n-iris-4 text-n-iris-11',
};

interface LabelProps {
    label: string;
    compact?: boolean;
    color?: LabelColor;
    title?: string;
    icon?: ReactNode;
}

export default function Label({ label, compact = false, color = 'slate', title = '', icon }: LabelProps) {
    return (
        <div
            title={title}
            className={[
                'rounded-lg -outline-offset-1 outline outline-1 inline-flex items-center flex-shrink-0',
                COLOR_CLASSES[color],
                compact ? 'px-1.5 h-6 gap-1 rounded-md' : 'px-2.5 h-8 gap-1.5 rounded-lg',
            ].join(' ')}
        >
            {icon}
            <span className={`whitespace-nowrap ${compact ? 'text-label-small' : 'text-label !font-420'}`}>
                {label}
            </span>
        </div>
    );
}
