// Port từ shared/components/GreetingsEditor.vue — nhánh richtext dùng
// WootMessageEditor (ProseMirror) vào B3 như message_signature; tạm textarea
// giữ nguyên flow lưu.
interface GreetingsEditorProps {
    value: string;
    label?: string;
    placeholder?: string;
    className?: string;
    onChange: (value: string) => void;
}

export default function GreetingsEditor({
    value,
    label = '',
    placeholder = '',
    className = '',
    onChange,
}: GreetingsEditorProps) {
    return (
        <section className={className}>
            {label ? <label className="text-sm font-medium text-n-slate-12">{label}</label> : null}
            <textarea
                rows={4}
                value={value}
                placeholder={placeholder}
                className="w-full bg-transparent p-0 !outline-0 !outline-none !mb-0 mt-1 text-sm text-n-slate-12 placeholder:text-n-slate-10 border-0 resize-none"
                onChange={event => onChange(event.target.value)}
            />
        </section>
    );
}
