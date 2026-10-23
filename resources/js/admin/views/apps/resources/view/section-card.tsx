import type { ReactNode } from 'react';
import { Panel } from '../../../../../superadmin/design-preview/components';
import '../../../../../superadmin/resource/resources.css';

export interface SectionCardProps {
    title: ReactNode; description?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; id?: string;
}
export function SectionCard({ title, description, action, children, className = '', id }: SectionCardProps) {
    return <Panel id={id} title={title} description={description} action={action} className={`console-section-panel ${className}`}>{children}</Panel>;
}
export interface TableCardProps {
    title: ReactNode; action?: ReactNode; children: ReactNode; footer?: ReactNode; id?: string;
}
export function TableCard({ title, action, children, footer, id }: TableCardProps) {
    return <Panel id={id} title={title} action={action} className="console-section-panel console-table-panel"><div className="preview-data-table"><div className="data-table-grid">{children}</div>{footer}</div></Panel>;
}
