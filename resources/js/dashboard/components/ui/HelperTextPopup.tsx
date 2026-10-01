import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components/ui/HelperTextPopup.vue
export default function HelperTextPopup({ message = '', className = '' }: { message?: string; className?: string }) {
    return (
        <div className={`relative group w-[inherit] whitespace-normal z-20 ${className}`.trim()}>
            <span className={`${ICONS.info} size-3.5 mt-0.5 text-n-slate-11 absolute`} aria-hidden="true" />
            <div className="bg-n-background w-fit ltr:left-4 rtl:right-4 top-0 border p-2.5 group-hover:flex items-center hidden absolute border-n-weak rounded-lg shadow-md">
                <p className="text-n-slate-12 mb-0 text-xs">{message}</p>
            </div>
        </div>
    );
}
