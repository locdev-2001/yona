import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import type { DashboardApp } from './types';

// Port từ dashboard/routes/dashboard/settings/integrations/DashboardApps/DashboardAppsRow.vue.
interface DashboardAppsRowProps {
    app: DashboardApp;
    onEdit: (app: DashboardApp) => void;
    onDelete: (app: DashboardApp) => void;
}

export default function DashboardAppsRow({ app, onEdit, onDelete }: DashboardAppsRowProps) {
    const endpoint = app.content?.[0]?.url ?? '';

    return (
        <BaseTableRow>
            <BaseTableCell>
                <span className="text-body-main text-n-slate-12 truncate block" title={app.title}>
                    {app.title}
                </span>
            </BaseTableCell>

            <BaseTableCell>
                <span className="text-body-main text-n-slate-11 truncate block" title={endpoint}>
                    {endpoint}
                </span>
            </BaseTableCell>

            <BaseTableCell align="end" className="w-24">
                <div className="flex justify-end gap-3 flex-shrink-0">
                    <Button
                        title={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.EDIT_TOOLTIP')}
                        icon="i-woot-edit-pen"
                        slate
                        sm
                        onClick={() => onEdit(app)}
                    />
                    <Button
                        title={t('INTEGRATION_SETTINGS.DASHBOARD_APPS.LIST.DELETE_TOOLTIP')}
                        icon="i-woot-bin"
                        slate
                        sm
                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                        onClick={() => onDelete(app)}
                    />
                </div>
            </BaseTableCell>
        </BaseTableRow>
    );
}
