// Port từ settings/inbox/components/InputRadioGroup.vue — <style scoped> đổi
// thành lớp Tailwind tương đương (label mb-1, nhóm inline-block mb-2, mục
// float-left mr-2.5, ô radio mr-2.5).
export interface RadioGroupItem {
    id: string;
    title: string;
    checked: boolean;
}

interface InputRadioGroupProps {
    name?: string;
    label?: string;
    items: RadioGroupItem[];
    onAction: (item: RadioGroupItem) => void;
}

export default function InputRadioGroup({
    name = 'string',
    label = '',
    items,
    onAction,
}: InputRadioGroupProps) {
    return (
        <div>
            <label className="mb-1">{label}</label>
            <div className="inline-block mb-2">
                {items.map(item => (
                    <div key={item.id} className="float-left ltr:mr-2.5 rtl:ml-2.5">
                        <label className="flex items-center cursor-pointer">
                            <input
                                className="my-0 ltr:mr-2.5 rtl:ml-2.5 ltr:ml-0 rtl:mr-0"
                                name={`${name} -radio-input`}
                                type="radio"
                                checked={item.checked}
                                onChange={() => onAction({ ...item, checked: true })}
                            />
                            <span>{item.title}</span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
