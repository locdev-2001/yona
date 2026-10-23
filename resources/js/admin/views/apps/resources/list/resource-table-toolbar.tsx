import type { ReactNode } from 'react';
import { SearchField } from '../../../../../superadmin/design-preview/components';
export interface ResourceTableToolbarProps {
    search: string; searchLabel: string; clearLabel: string; canClear: boolean; filters?: ReactNode;
    onSearchChange: (search: string) => void; onSubmit: () => void; onClear: () => void;
}
export function ResourceTableToolbar({ search, searchLabel, clearLabel, onSearchChange, onSubmit, onClear }: ResourceTableToolbarProps) {
    return <form role="search" onSubmit={event => { event.preventDefault(); onSubmit(); }}><SearchField label={searchLabel} placeholder={searchLabel} value={search} onChange={onSearchChange} clearLabel={clearLabel} onClear={onClear} /></form>;
}
