import { useEffect, useRef, useState } from 'react';

import InlineInput from 'dashboard/components-next/inline-input/InlineInput';

// Port từ components-next/filter/inputs/MultiTextInput.vue — nhập nhiều giá trị
// văn bản thành chip (Enter để thêm, blur cũng chốt bản nháp).
interface MultiTextInputProps {
    value: string[];
    placeholder?: string;
    onChange: (value: string[]) => void;
}

export default function MultiTextInput({ value, placeholder = '', onChange }: MultiTextInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [draft, setDraft] = useState('');
    const [isFocused, setFocused] = useState(false);
    const showInput = isFocused || !value.length;

    useEffect(() => {
        if (isFocused) inputRef.current?.focus();
    }, [isFocused]);

    const commitDraft = (shouldFocus: boolean) => {
        const next = draft.trim();
        if (next) {
            onChange([...value, next]);
            setDraft('');
        }
        if (shouldFocus) inputRef.current?.focus();
    };

    const removeValue = (index: number) => onChange(value.filter((_, valueIndex) => valueIndex !== index));

    return (
        <div
            className={`flex flex-wrap items-center w-full min-w-64 gap-1 py-[0.1875rem] rounded-lg bg-n-alpha-2 focus:outline-none ${value.length ? 'px-[0.1875rem]' : 'px-3'}`}
            tabIndex={0}
            onFocus={() => setFocused(true)}
            onClick={() => setFocused(true)}
        >
            {value.map((item, index) => (
                <div key={index} className="flex items-center justify-center max-w-full h-6 gap-1 px-1 py-0.5 text-sm leading-4 border rounded-lg bg-n-solid-1 border-n-weak">
                    <span className="flex-grow min-w-0 truncate text-n-slate-12">{item}</span>
                    <span
                        className="flex-shrink-0 transition-colors cursor-pointer i-lucide-x size-3.5 text-n-slate-9 hover:text-n-slate-12"
                        onClick={event => {
                            event.stopPropagation();
                            removeValue(index);
                        }}
                    />
                </div>
            ))}
            {showInput ? (
                <InlineInput
                    ref={inputRef}
                    value={draft}
                    placeholder={placeholder}
                    className="flex-1 min-w-32"
                    onChange={event => setDraft(event.target.value)}
                    onEnterPress={() => commitDraft(true)}
                    onBlur={() => {
                        commitDraft(false);
                        setFocused(false);
                    }}
                />
            ) : null}
        </div>
    );
}
