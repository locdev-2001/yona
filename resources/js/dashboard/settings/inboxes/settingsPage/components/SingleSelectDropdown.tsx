// Port từ settings/inbox/components/SingleSelectDropdown.vue — <option> gốc chỉ
// render text nên value = chính text đó.
export interface DropdownOption {
    key: number;
    value: string;
}

interface SingleSelectDropdownProps {
    label?: string;
    options: DropdownOption[];
    selected: string;
    className?: string;
    onAction: (value: string) => void;
}

export default function SingleSelectDropdown({
    label = '',
    options,
    selected,
    className = '',
    onAction,
}: SingleSelectDropdownProps) {
    return (
        <div className={className}>
            <label htmlFor="dropdown-select">{label}</label>
            <select
                id="dropdown-select"
                name="dropdown-select"
                value={selected}
                onChange={event => onAction(event.target.value)}
            >
                {options.map(option => (
                    <option key={option.key}>{option.value}</option>
                ))}
            </select>
        </div>
    );
}
