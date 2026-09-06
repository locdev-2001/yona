import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';

// Port từ dashboard/components-next/label/AddLabel.vue.
interface AddLabelProps {
    labelMenuItems?: DropdownMenuItem[];
    onUpdateLabel?: (item: DropdownMenuItem) => void;
}

export default function AddLabel({ labelMenuItems = [], onUpdateLabel }: AddLabelProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showDropdown) return undefined;

        const handleClickAway = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showDropdown]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                className={`flex items-center gap-1 px-2 py-1 rounded-md outline-dashed h-6 outline-1 outline-n-slate-6 hover:bg-n-alpha-2 ${
                    showDropdown ? 'bg-n-alpha-2' : ''
                }`.trim()}
                onClick={() => setShowDropdown(open => !open)}
            >
                <span className="i-lucide-plus" />
                <span className="text-sm text-n-slate-11">{t('LABEL.TAG_BUTTON')}</span>
            </button>
            {showDropdown ? (
                <DropdownMenu
                    menuItems={labelMenuItems}
                    showSearch
                    className="z-[100] w-48 mt-2 ltr:left-0 rtl:right-0 top-full max-h-52"
                    renderThumbnail={item => (
                        <div
                            className="rounded-sm size-2"
                            style={{ backgroundColor: (item.thumbnail as { color?: string })?.color }}
                        />
                    )}
                    onAction={item => onUpdateLabel?.(item)}
                />
            ) : null}
        </div>
    );
}
