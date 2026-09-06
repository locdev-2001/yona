// Port từ routes/dashboard/inbox/components/MenuItem.vue.
export default function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <div
            role="button"
            className="flex items-center w-full h-8 px-2 py-1 rounded-md cursor-pointer hover:text-n-blue-11 min-w-0"
            onClick={event => {
                event.stopPropagation();
                onClick();
            }}
        >
            <span className="text-xs font-medium truncate text-n-slate-12">{label}</span>
        </div>
    );
}
