import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import Loader from 'shared/components/loader/Loader';
import { useClickAway } from 'dashboard/composables/useClickAway';
import ComboBoxDropdown from './ComboBoxDropdown';
import type { ComboBoxDropdownHandle, ComboBoxDropdownOption } from './ComboBoxDropdown';

// Port từ components-next/combobox/ReorderableMultiSelect.vue — chọn nhiều,
// kéo đổi thứ tự, giới hạn `max`; model là danh sách value theo đúng thứ tự.
interface ReorderableMultiSelectProps {
    value: (string | number)[];
    options: ComboBoxDropdownOption[];
    max?: number;
    label?: string;
    addLabel?: string;
    searchPlaceholder?: string;
    emptyState?: string;
    fallbackIcon?: string;
    loading?: boolean;
    disabled?: boolean;
    serverSearch?: boolean;
    counter?: (remaining: number, max: number) => ReactNode;
    note?: ReactNode;
    onChange: (value: (string | number)[]) => void;
    onSearch?: (query: string) => void;
}

export default function ReorderableMultiSelect({
    value,
    options,
    max = 3,
    label = '',
    addLabel = '',
    searchPlaceholder = '',
    emptyState = '',
    fallbackIcon = 'i-lucide-file-text',
    loading = false,
    disabled = false,
    serverSearch = false,
    counter,
    note,
    onChange,
    onSearch,
}: ReorderableMultiSelectProps) {
    const [isOpen, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const dropdownRef = useRef<ComboBoxDropdownHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickAway(containerRef, () => setOpen(false), isOpen);

    const optionsByValue = useMemo(() => new Map(options.map(option => [option.value, option])), [options]);
    const selectedRows = value.map(id => optionsByValue.get(id) ?? { value: id, label: String(id) });
    const remaining = max - value.length;
    const canAddMore = value.length < max;

    const dropdownOptions = useMemo(() => {
        const available = options.filter(option => !value.includes(option.value));
        if (serverSearch) return available;

        const query = searchQuery.toLowerCase();

        return available.filter(option => option.label?.toLowerCase().includes(query));
    }, [options, value, serverSearch, searchQuery]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        onSearch?.(query);
    };

    const onDragOver = (index: number) => {
        if (dragIndex === null || dragIndex === index) return;

        const ids = [...value];
        const [moved] = ids.splice(dragIndex, 1);
        ids.splice(index, 0, moved);
        setDragIndex(index);
        onChange(ids);
    };

    return (
        <div>
            {label || counter ? (
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-n-slate-12">{label}</label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-n-slate-10">{counter?.(remaining, max)}</span>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: max }, (_, index) => index + 1).map(slot => (
                                <span
                                    key={slot}
                                    className={`w-4 h-1 rounded-full ${slot <= value.length ? 'bg-n-brand' : 'bg-n-slate-4'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            <div ref={containerRef}>
                <div
                    className={`flex flex-col gap-1 p-1 rounded-xl bg-n-surface-field ${
                        disabled ? 'opacity-50 pointer-events-none' : ''
                    }`}
                >
                    {loading && value.length && !isOpen ? (
                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[216px]" aria-busy="true">
                            {value.map((id, index) => (
                                <div
                                    key={`skeleton-${index}`}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-n-alpha-2"
                                >
                                    <span className="flex-shrink-0 opacity-40 i-lucide-grip-vertical size-4 text-n-slate-9" />
                                    <div className="flex-shrink-0 rounded-md size-6 bg-n-alpha-3" />
                                    <div className="flex-grow min-w-0">
                                        <p className="mb-0 text-sm">
                                            <span className="inline-block w-32 h-2.5 align-middle rounded bg-n-alpha-3 animate-pulse" />
                                        </p>
                                        <p className="mb-0 text-xs">
                                            <span className="inline-block w-20 h-2 align-middle rounded bg-n-alpha-3 animate-pulse" />
                                        </p>
                                    </div>
                                    <span className="flex-shrink-0 size-6" />
                                </div>
                            ))}
                        </div>
                    ) : selectedRows.length ? (
                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[216px]">
                            {selectedRows.map((row, index) => (
                                <div
                                    key={row.value}
                                    draggable
                                    className={`flex items-center gap-2 px-2 py-1.5 transition-colors rounded-lg cursor-grab group/row ${
                                        index === dragIndex
                                            ? 'opacity-40 bg-n-alpha-3 ring-1 ring-inset ring-n-brand'
                                            : 'bg-n-alpha-2 hover:bg-n-alpha-3'
                                    }`}
                                    onDragStart={() => setDragIndex(index)}
                                    onDragOver={event => {
                                        event.preventDefault();
                                        onDragOver(index);
                                    }}
                                    onDragEnd={() => setDragIndex(null)}
                                >
                                    <span className="flex-shrink-0 transition-colors i-lucide-grip-vertical size-4 text-n-slate-9 group-hover/row:text-n-slate-11" />
                                    <div className="flex items-center justify-center flex-shrink-0 text-sm rounded-md size-6 bg-n-alpha-3 text-n-slate-11">
                                        {row.icon ? (
                                            <EmojiIcon value={row.icon} color={row.iconColor} className="shrink-0 size-4" />
                                        ) : (
                                            <span className={`size-4 ${fallbackIcon}`} />
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="mb-0 text-sm truncate text-n-slate-12">{row.label}</p>
                                        {row.subtitle ? (
                                            <p className="mb-0 text-xs truncate text-n-slate-10">{row.subtitle}</p>
                                        ) : null}
                                    </div>
                                    <Button
                                        type="button"
                                        ghost
                                        slate
                                        xs
                                        noAnimation
                                        icon="i-lucide-x"
                                        className="flex-shrink-0"
                                        onClick={() => onChange(value.filter(id => id !== row.value))}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {canAddMore ? (
                        <div className="relative">
                            <Button
                                type="button"
                                ghost
                                slate
                                sm
                                noAnimation
                                justify="start"
                                disabled={loading && !isOpen}
                                className="w-full"
                                onClick={() => {
                                    const next = !isOpen;
                                    setOpen(next);
                                    if (next) {
                                        handleSearch('');
                                        setTimeout(() => dropdownRef.current?.focus(), 0);
                                    }
                                }}
                            >
                                {loading && !isOpen ? (
                                    <Loader size={16} className="text-n-slate-11" />
                                ) : (
                                    <Icon icon="i-lucide-search" className="flex-shrink-0 size-4" />
                                )}
                                <span className="min-w-0 truncate">{addLabel}</span>
                            </Button>
                            <ComboBoxDropdown
                                ref={dropdownRef}
                                open={isOpen}
                                options={dropdownOptions}
                                searchValue={searchQuery}
                                searchPlaceholder={searchPlaceholder}
                                emptyState={emptyState}
                                loading={loading}
                                onSearch={handleSearch}
                                onSelect={option => {
                                    if (value.length >= max) return;
                                    const next = [...value, option.value];
                                    onChange(next);
                                    if (next.length >= max) setOpen(false);
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {value.length && note ? (
                <p className="flex items-center gap-1.5 mt-1.5 mb-0 text-xs text-n-slate-11">
                    <span className="rounded-full size-1.5 bg-n-teal-9" />
                    {note}
                </p>
            ) : null}
        </div>
    );
}
