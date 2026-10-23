import type { ReactNode } from 'react';
import { SearchField } from '../../../../superadmin/design-preview/components';
export interface ListToolbarSearch { id: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; onSubmit?: () => void; onClear?: () => void; }
export interface ListToolbarProps { search?: ListToolbarSearch; filters?: ReactNode; children?: ReactNode; }
export function ListToolbar({ search, filters, children }: ListToolbarProps) {
    const input = search && <SearchField label={search.label} placeholder={search.placeholder} value={search.value} onChange={search.onChange} onClear={search.onClear} />;
    return <div className="console-operation-toolbar"><div className="console-operation-filters">{search?.onSubmit ? <form onSubmit={event => { event.preventDefault(); search.onSubmit?.(); }}>{input}</form> : input}{filters}</div>{children && <div className="console-operation-actions">{children}</div>}</div>;
}
