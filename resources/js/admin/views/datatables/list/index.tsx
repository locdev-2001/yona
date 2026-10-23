import type { ReactNode } from 'react';
import '../../../../superadmin/resource/resources.css';
export interface ListCardProps { filters?: ReactNode; toolbar?: ReactNode; table: ReactNode; pagination?: ReactNode; }
export default function ListCard({ filters, toolbar, table, pagination }: ListCardProps) {
    return <section className="preview-panel console-operation-list">{filters}{toolbar}{table}{pagination}</section>;
}
