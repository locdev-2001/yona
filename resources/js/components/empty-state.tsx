import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}

/**
 * Shared empty / zero-data block (design-system §7.4) — icon + title +
 * description + optional CTA. Themes via tokens so light + dark both work.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
            {Icon && (
                <div className="bg-secondary text-muted-foreground flex size-11 items-center justify-center rounded-full">
                    <Icon className="size-5" aria-hidden />
                </div>
            )}
            <div className="space-y-1">
                <p className="font-medium">{title}</p>
                {description && <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>}
            </div>
            {action}
        </div>
    );
}
