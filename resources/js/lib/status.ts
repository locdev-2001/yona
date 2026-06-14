import { CheckCircle2, Clock, Info, XCircle, type LucideIcon } from 'lucide-react';

/**
 * Single source of truth for status -> visual mapping (design-system §7.3).
 * Map keys MUST match the domain enums in docs/crm-business-rules.md.
 * Never re-decide "won = green" inline in a component — import from here.
 * Classes use semantic tokens only (no raw hex / palette names) per §7.1.
 * `label` holds an i18n key resolved by the consumer (StatusBadge) per §10.
 */
export type StatusMeta = { label: string; class: string; icon: LucideIcon };

export const dealStatus = {
    won: { label: 'platform.status.won', class: 'text-success bg-success/10', icon: CheckCircle2 },
    pending: { label: 'platform.status.pending', class: 'text-warning bg-warning/10', icon: Clock },
    lost: { label: 'platform.status.lost', class: 'text-destructive bg-destructive/10', icon: XCircle },
} as const satisfies Record<string, StatusMeta>;

export type DealStatus = keyof typeof dealStatus;

/** Task/lead priority flags reuse the same status fg (design-system §2). */
export const priority = {
    urgent: { label: 'platform.status.urgent', class: 'text-destructive bg-destructive/10', icon: XCircle },
    normal: { label: 'platform.status.normal', class: 'text-warning bg-warning/10', icon: Info },
    low: { label: 'platform.status.low', class: 'text-success bg-success/10', icon: CheckCircle2 },
} as const satisfies Record<string, StatusMeta>;

export type Priority = keyof typeof priority;
