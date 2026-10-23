import type { ReactNode } from 'react';
import { StatusBadge as DesignStatusBadge, type Tone } from '../../../superadmin/design-preview/components';
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';
const designTone: Record<StatusTone, Tone> = { success: 'positive', warning: 'warning', danger: 'danger', neutral: 'system' };
export default function StatusBadge({ tone, children, className = '' }: { tone: StatusTone; children: ReactNode; className?: string }) {
    return <span className={className}><DesignStatusBadge tone={designTone[tone]}>{children}</DesignStatusBadge></span>;
}
