interface LabelDropdownItemProps {
    id: string;
    title: string;
    color?: string;
    selected?: boolean;
    active?: boolean;
    onHover: () => void;
    onSelectLabel: () => void;
}

export default function LabelDropdownItem({
    id,
    title,
    color = '',
    selected = false,
    active = false,
    onHover,
    onSelectLabel,
}: LabelDropdownItemProps) {
    return (
        <li
            id={id}
            role="option"
            aria-selected={selected}
            data-active={active || undefined}
            className={`flex items-center justify-between gap-2 min-h-8 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm text-n-slate-12 ${
                active ? 'bg-n-alpha-2' : ''
            }`}
            onMouseEnter={onHover}
            onMouseDown={event => event.preventDefault()}
            onClick={onSelectLabel}
        >
            <span className="flex items-center min-w-0 gap-2">
                {color ? (
                    <span
                        className="size-3 flex-shrink-0 rounded-full outline outline-1 outline-n-weak"
                        style={{ backgroundColor: color }}
                    />
                ) : null}
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={title}>
                    {title}
                </span>
            </span>
            {selected ? <span aria-hidden className="i-lucide-circle-check size-4 flex-shrink-0 text-n-blue-11" /> : null}
        </li>
    );
}
