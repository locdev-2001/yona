import type { FormEvent, ReactNode } from 'react';
import { FieldGroup } from '@admin/components/ui/field';
import PageHeader from '@admin/views/pages/page-header';
import '../../../../../superadmin/resource/resources.css';

export interface RecordFormProps {
    title: string;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    children: ReactNode;
    actions: ReactNode;
}

export function RecordForm({ title, onSubmit, children, actions }: RecordFormProps) {
    return <div className="console-resource-page">
        <PageHeader title={title} />
        <form className="preview-panel console-record-form" noValidate onSubmit={onSubmit}>
            <FieldGroup className="console-record-fields">{children}</FieldGroup>
            <div className="console-record-actions">{actions}</div>
        </form>
    </div>;
}
