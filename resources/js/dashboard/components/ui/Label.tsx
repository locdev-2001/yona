import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

// Port từ dashboard/components/ui/Label.vue (`woot-label`) — chip nhãn của khối
// Conversation Labels và của thẻ danh sách hội thoại. KHÁC với
// components-next/label/Label.tsx (chip của trang Contacts, bo góc + outline).
// Chỉ port hai variant đang dùng (smooth/dashed) + `small` + nút đóng; các
// colorScheme primary/secondary/... chưa có call-site nào nên chưa dựng.
// Style scoped SCSS gốc dựng lại bằng class Tailwind: mỗi thuộc tính chỉ phát
// đúng một lớp để không phụ thuộc thứ tự luật trong bundle CSS.
interface LabelProps {
    title: string;
    description?: string;
    color?: string;
    variant?: 'smooth' | 'dashed' | '';
    small?: boolean;
    showClose?: boolean;
    className?: string;
    onRemove?: (title: string) => void;
}

const VARIANT_CLASSES: Record<string, string> = {
    smooth: 'bg-transparent text-n-slate-11 dark:text-n-slate-12 border-solid border-n-strong',
    dashed: 'bg-transparent text-n-slate-11 dark:text-n-slate-12 border-dashed border-n-strong',
    '': 'bg-n-slate-3 text-n-slate-12 border-solid border-n-strong',
};

export default function Label({
    title,
    description = '',
    color = '',
    variant = '',
    small = false,
    showClose = false,
    className = '',
    onRemove,
}: LabelProps) {
    const showColorDot = Boolean((variant === 'smooth' || variant === 'dashed') && title);

    return (
        <div
            className={[
                'label inline-flex ltr:mr-1 rtl:ml-1 mb-1 items-center font-medium text-xs rounded-[4px] gap-1 border',
                small ? 'py-0.5 px-1 leading-tight h-5' : 'p-1 h-6',
                VARIANT_CLASSES[variant],
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            title={description}
        >
            {showColorDot ? (
                <span
                    className={`label-color-dot flex-shrink-0 inline-block rounded-sm shadow-sm ${
                        small ? 'w-2 h-2' : 'w-3 h-3'
                    }`}
                    style={{ background: color }}
                />
            ) : null}
            <span className="whitespace-nowrap text-ellipsis overflow-hidden">{title}</span>
            {showClose ? (
                <button
                    type="button"
                    className="label-close--button p-0 text-n-slate-11 -mb-0.5 rounded-sm cursor-pointer flex items-center justify-center hover:bg-n-slate-3"
                    onClick={() => onRemove?.(title)}
                >
                    <FluentIcon icon="dismiss" size={12} className="close--icon text-n-slate-11" />
                </button>
            ) : null}
        </div>
    );
}
