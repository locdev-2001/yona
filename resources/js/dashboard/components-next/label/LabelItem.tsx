import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components-next/label/LabelItem.vue.
export interface ContactLabel {
    id: number;
    title: string;
    color: string;
}

interface LabelItemProps {
    label: ContactLabel;
    isHovered?: boolean;
    onRemove: (label: ContactLabel) => void;
    onHover: (labelId: number) => void;
}

export default function LabelItem({ label, isHovered = false, onRemove, onHover }: LabelItemProps) {
    return (
        <div
            className="flex items-center px-1 py-1 overflow-hidden transition-all duration-300 ease-out rounded-md bg-n-alpha-2 h-7"
            onMouseEnter={() => onHover(label.id)}
        >
            <div className="w-2 h-2 m-1 rounded-sm" style={{ backgroundColor: label.color }} />
            <span className="text-sm text-n-slate-12 ltr:mr-px rtl:ml-px">{label.title}</span>
            <div
                className={`flex relative ltr:left-1 rtl:right-1 flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-out ${
                    isHovered ? 'w-6' : 'w-0'
                }`}
            >
                <Button
                    className={`transition-opacity duration-200 !h-7 ltr:rounded-r-md rtl:rounded-l-md ltr:rounded-l-none rtl:rounded-r-none w-6 bg-transparent ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                    type="button"
                    slate
                    xs
                    faded
                    icon="i-lucide-x"
                    onClick={() => onRemove(label)}
                />
            </div>
        </div>
    );
}
