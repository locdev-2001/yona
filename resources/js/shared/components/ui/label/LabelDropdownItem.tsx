import NextButton from 'dashboard/components-next/button/Button';

// Port từ shared/components/ui/label/LabelDropdownItem.vue.
// `<woot-dropdown-item>` gốc = `<li class="mb-1 list-none dropdown-menu__item">`
// với style scoped ép nút con thành khối đầy chiều ngang — dựng thẳng ở đây vì
// chỉ LabelDropdown dùng tới.
interface LabelDropdownItemProps {
    title: string;
    color?: string;
    selected?: boolean;
    onSelectLabel: (title: string) => void;
}

export default function LabelDropdownItem({
    title,
    color = '',
    selected = false,
    onSelectLabel,
}: LabelDropdownItemProps) {
    return (
        <li className="mb-1 list-none dropdown-menu__item">
            <NextButton
                blue
                ghost
                trailingIcon
                icon={selected ? 'i-lucide-circle-check' : ''}
                className={`w-full !px-2.5 justify-between inline-flex whitespace-nowrap text-left ${
                    selected ? '' : '!flex-row'
                }`.trim()}
                onClick={() => onSelectLabel(title)}
            >
                <div className="flex items-center min-w-0 gap-2">
                    {color ? (
                        <div
                            className="size-3 flex-shrink-0 rounded-full outline outline-1 outline-n-weak"
                            style={{ backgroundColor: color }}
                        />
                    ) : null}
                    <span
                        className="overflow-hidden text-ellipsis whitespace-nowrap leading-[1.1]"
                        title={title}
                    >
                        {title}
                    </span>
                </div>
            </NextButton>
        </li>
    );
}
