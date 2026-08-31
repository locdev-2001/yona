import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import Button from 'dashboard/components-next/button/Button';
import EmptyState from 'dashboard/components/widgets/EmptyState';
import WizardLayout, { CREATE_ROUTES, EDIT_ROUTES } from './WizardLayout';
import type { DashboardPageProps } from '../../types';

// Port từ teams/FinishSetup.vue (dùng chung cho bước cuối của cả 2 luồng).
interface FinishSetupProps {
    flow: 'create' | 'edit';
}

export default function FinishSetup({ flow }: FinishSetupProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('TEAMS_SETTINGS.HEADER')} showBackButton>
                <WizardLayout
                    flow={flow}
                    activeRoute={
                        flow === 'create' ? CREATE_ROUTES.WIZARD_FINISH : EDIT_ROUTES.EDIT_WIZARD_FINISH
                    }
                >
                    <div className="h-full w-full p-6 col-span-6">
                        <EmptyState
                            title={t('TEAMS_SETTINGS.FINISH.TITLE')}
                            message={t('TEAMS_SETTINGS.FINISH.MESSAGE')}
                        >
                            <div className="w-full text-center">
                                <a href={accountScopedUrl(accountId, 'settings/teams/list')}>
                                    <Button teal label={t('TEAMS_SETTINGS.FINISH.BUTTON_TEXT')} />
                                </a>
                            </div>
                        </EmptyState>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
