import type { ReactNode } from 'react';

// Port từ dashboard/components/widgets/EmptyState.vue
interface EmptyStateProps {
    title?: string;
    message?: string;
    children?: ReactNode;
}

export default function EmptyState({ title = '', message = '', children }: EmptyStateProps) {
    return (
        <div className="empty-state py-16 px-1 ml-0 mr-0">
            {title ? (
                <h3 className="text-n-slate-12 block text-center w-full text-xl font-medium">{title}</h3>
            ) : null}
            {message ? (
                <p className="block text-center text-n-slate-11 my-4 mx-auto w-[90%]">{message}</p>
            ) : null}
            {children}
        </div>
    );
}
