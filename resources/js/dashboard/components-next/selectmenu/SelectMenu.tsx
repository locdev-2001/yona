import { useEffect, useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components-next/selectmenu/SelectMenu.vue.
export interface SelectMenuOption {
    label: string;
    value: string;
}

interface SelectMenuProps {
    options: SelectMenuOption[];
    value: string;
    label: string;
    subMenuPosition?: 'right' | 'left' | 'bottom';
    onChange: (value: string) => void;
}

const SUB_MENU_POSITION_CLASSES = {
    right: 'ltr:left-full rtl:right-full ltr:ml-1 rtl:mr-1',
    left: 'ltr:right-full rtl:left-full ltr:mr-1 rtl:ml-1',
    bottom: 'top-full mt-1 ltr:right-0 rtl:left-0',
};

export default function SelectMenu({ options, value, label, subMenuPosition = 'right', onChange }: SelectMenuProps) {
    const [isOpen, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleClickAway = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [isOpen]);

    return (
        <div ref={rootRef} className="relative flex flex-col gap-1 w-fit">
            <Button
                icon="i-lucide-chevron-down"
                size="sm"
                trailingIcon
                color="slate"
                variant="faded"
                className={`!w-fit max-w-40 ${isOpen ? '!bg-n-slate-9/20' : ''}`.trim()}
                label={label}
                onClick={() => setOpen(open => !open)}
            />
            {isOpen ? (
                <div
                    className={`absolute select-none max-w-64 flex flex-col gap-1 bg-n-alpha-3 backdrop-blur-[100px] p-1 top-0 shadow-lg z-40 rounded-lg border border-n-weak ${SUB_MENU_POSITION_CLASSES[subMenuPosition]}`}
                >
                    {options.map(option => (
                        <Button
                            key={option.value}
                            label={option.label}
                            icon={option.value === value ? 'i-lucide-check' : ''}
                            size="sm"
                            variant="ghost"
                            color="slate"
                            trailingIcon
                            className={`!justify-end !px-2.5 !h-7 ${option.value === value ? '!bg-n-alpha-2' : ''}`.trim()}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
