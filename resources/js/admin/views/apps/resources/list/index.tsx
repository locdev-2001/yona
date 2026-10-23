import type { ReactNode } from 'react';
import PageHeader from '@admin/views/pages/page-header';
import '../../../../../superadmin/resource/resources.css';
export interface ResourceListAppProps { title: string; description: string; actions?: ReactNode; table: ReactNode; }
export default function ResourceListApp({ title, description, actions, table }: ResourceListAppProps) {
    return <div className="console-resource-page"><PageHeader title={title} description={description} actions={actions} />{table}</div>;
}
