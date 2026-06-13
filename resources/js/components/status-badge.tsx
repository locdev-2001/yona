import { dealStatus, priority, type DealStatus, type Priority, type StatusMeta } from '@/lib/status';
import { cn } from '@/lib/utils';

/**
 * Shared status / priority pill (design-system §7.4).
 * Color + icon + label — never color alone (§6). Styling comes from
 * lib/status.ts only; do not inline colored spans per screen.
 */
function Pill({ meta }: { meta: StatusMeta }) {
    const Icon = meta.icon;
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.class)}>
            <Icon className="size-3.5" aria-hidden />
            {meta.label}
        </span>
    );
}

export function StatusBadge({ status }: { status: DealStatus }) {
    return <Pill meta={dealStatus[status]} />;
}

export function PriorityBadge({ level }: { level: Priority }) {
    return <Pill meta={priority[level]} />;
}
