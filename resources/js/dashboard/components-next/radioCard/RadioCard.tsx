import type { ReactNode } from 'react';

// Port từ dashboard/components-next/radioCard/RadioCard.vue
// (chip disabled/beta dùng Label.vue — vào khi màn nào cần; profile không dùng).
interface RadioCardProps {
    id: string;
    name?: string;
    label: string;
    description: string;
    isActive?: boolean;
    disabled?: boolean;
    disabledMessage?: string;
    className?: string;
    onSelect: (id: string) => void;
    children?: ReactNode;
}

export default function RadioCard({
    id,
    name = '',
    label,
    description,
    isActive = false,
    disabled = false,
    disabledMessage = '',
    className = '',
    onSelect,
    children,
}: RadioCardProps) {
    const handleChange = () => {
        if (!isActive && !disabled) {
            onSelect(id);
        }
    };

    return (
        <label
            htmlFor={id}
            className={[
                'rounded-xl outline outline-1 p-4 transition-all duration-200 bg-n-solid-1 py-4 ltr:pl-4 rtl:pr-4 ltr:pr-6 rtl:pl-6 focus-within:has-[:focus-visible]:ring-2 focus-within:has-[:focus-visible]:ring-n-strong',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                isActive ? 'outline-n-blue-9' : 'outline-n-weak',
                !disabled && !isActive ? 'hover:outline-n-strong' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div className="flex flex-col gap-2 items-start">
                <div className="flex items-center justify-between w-full gap-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-heading-3 text-n-slate-12">{label}</h3>
                    </div>
                    <input
                        id={id}
                        checked={isActive}
                        value={id}
                        name={name || id}
                        disabled={disabled}
                        type="radio"
                        className="shadow cursor-pointer grid place-items-center border-2 border-n-strong appearance-none rounded-full w-5 h-5 checked:bg-n-brand before:content-[''] before:bg-n-brand before:border-4 before:rounded-full before:border-n-strong checked:before:w-[18px] checked:before:h-[18px] checked:border checked:border-n-brand"
                        onChange={handleChange}
                    />
                </div>
                <p className="text-body-main text-n-slate-11">
                    {disabled && disabledMessage ? disabledMessage : description}
                </p>
                {children}
            </div>
        </label>
    );
}
