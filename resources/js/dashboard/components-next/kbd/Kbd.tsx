import { keyLabel } from 'shared/helpers/kbd';

// Chip một phím: nền nhạt, viền mảnh, gờ dưới như phím thật.
export default function Kbd({ keyName, className = '' }: { keyName: string; className?: string }) {
    return (
        <kbd
            className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md border border-n-weak border-b-2 bg-n-surface-1 font-sans text-xs font-medium leading-none text-n-slate-12 select-none ${className}`}
        >
            {keyLabel(keyName)}
        </kbd>
    );
}
