import { useMemo } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Switch from 'dashboard/components-next/switch/Switch';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import { t } from '../../../i18n';
import { formatDelay } from './automationHelper';
import type { AutomationRule } from './types';

interface Props {
    rule: AutomationRule;
    loading: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onClone: () => void;
    onDelete: () => void;
}

export default function AutomationRuleRow({ rule, loading, onToggle, onEdit, onClone, onDelete }: Props) {
    const created = useMemo(() => rule.created_on ? new Date(rule.created_on * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '', [rule.created_on]);

    return (
        <BaseTableRow>
            <BaseTableCell className="max-w-0 w-full">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-body-main text-n-slate-12 truncate">{rule.name}</span>
                    {rule.execution_delay ? <span className="text-xs px-1.5 py-0.5 rounded-md bg-n-alpha-2 text-n-slate-11 whitespace-nowrap">{t('AUTOMATION.LIST.DELAY_BADGE', { delay: formatDelay(rule.execution_delay) })}</span> : null}
                    <div className="w-px h-3 rounded-lg bg-n-weak flex-shrink-0" />
                    <span className="text-body-main text-n-slate-11 truncate">{rule.description}</span>
                </div>
            </BaseTableCell>
            <BaseTableCell><Switch value={rule.active} onChange={onToggle} /></BaseTableCell>
            <BaseTableCell><span className="text-body-main text-n-slate-12 whitespace-nowrap">{created}</span></BaseTableCell>
            <BaseTableCell align="end">
                <div className="flex gap-3 justify-end flex-shrink-0">
                    <Button title={t('AUTOMATION.FORM.EDIT')} icon="i-woot-edit-pen" slate sm isLoading={loading} onClick={onEdit} />
                    <Button title={t('AUTOMATION.CLONE.TOOLTIP')} icon="i-woot-clone" slate sm isLoading={loading} onClick={onClone} />
                    <Button title={t('AUTOMATION.FORM.DELETE')} icon="i-woot-bin" slate sm isLoading={loading} className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2" onClick={onDelete} />
                </div>
            </BaseTableCell>
        </BaseTableRow>
    );
}
