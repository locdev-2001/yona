// Port từ v3/components/SnackBar/Item.vue
export interface SnackbarAction {
    message: string;
    onClick?: () => void;
}

interface SnackbarItemProps {
    message: string;
    action?: SnackbarAction;
}

export default function SnackbarItem({ message, action }: SnackbarItemProps) {
    const isActionPresent = Boolean(action?.message);

    return (
        <div
            className={`bg-n-slate-12 rounded-md mb-4 max-w-[40rem] inline-flex items-center min-w-[22rem] py-3 px-4 animate-fade-in-up ${
                isActionPresent ? 'justify-between' : 'justify-center'
            }`}
        >
            <div className="text-sm font-medium text-n-slate-1">{message}</div>
            {isActionPresent ? (
                <button
                    type="button"
                    className="text-sm font-medium text-n-slate-1 underline"
                    onClick={action?.onClick}
                >
                    {action?.message}
                </button>
            ) : null}
        </div>
    );
}
