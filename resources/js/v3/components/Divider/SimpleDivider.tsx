// Port từ v3/components/Divider/SimpleDivider.vue
interface SimpleDividerProps {
    label?: string;
    bg?: string;
    className?: string;
}

export default function SimpleDivider({
    label = '',
    bg = 'bg-white',
    className = '',
}: SimpleDividerProps) {
    return (
        <div className={`relative my-4 section-separator ${className}`}>
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-n-strong" />
            </div>
            {label ? (
                <div className="relative flex justify-center text-sm">
                    <span className={`px-2 text-n-slate-10 ${bg}`}>{label}</span>
                </div>
            ) : null}
        </div>
    );
}
