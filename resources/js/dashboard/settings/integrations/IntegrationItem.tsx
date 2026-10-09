import { Link } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';
import { frontendURL } from 'dashboard/helper/URLHelper';
import { useBranding } from 'shared/composables/useBranding';
import Button from 'dashboard/components-next/button/Button';
import Label from 'dashboard/components-next/label/Label';

// Port từ dashboard/routes/dashboard/settings/integrations/IntegrationItem.vue.
interface IntegrationItemProps {
    accountId: number;
    id: string;
    name?: string;
    description?: string;
    enabled?: boolean;
}

export default function IntegrationItem({
    accountId,
    id,
    name = '',
    description = '',
    enabled = false,
}: IntegrationItemProps) {
    const { replaceInstallationName } = useBranding();

    return (
        <div className="flex flex-col flex-1 p-4 m-px panel-surface rounded-xl">
            <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 mb-2">
                    <img
                        src={`/dashboard/images/integrations/${id}.png`}
                        className="max-w-full rounded-md block bg-n-surface-field"
                    />
                </div>
                <Label label={t(`INTEGRATION_APPS.STATUS.${enabled ? 'ENABLED' : 'DISABLED'}`)} color={enabled ? 'teal' : 'slate'} compact />
            </div>
            <div className="flex flex-col m-0 flex-1">
                <div className="font-medium mb-2 text-n-slate-12 flex justify-between items-center">
                    <span className="text-heading-3 text-n-slate-12">{name}</span>
                    <Link href={frontendURL(`accounts/${accountId}/settings/integrations/${id}`)}>
                        <Button label={t('INTEGRATION_APPS.CONFIGURE')} icon={ICONS.settings} link xs />
                    </Link>
                </div>
                <p className="text-n-slate-11 text-body-main">{replaceInstallationName(description)}</p>
            </div>
        </div>
    );
}
