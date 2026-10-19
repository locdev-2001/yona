import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import AutoResolve from '../account/AutoResolve';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../types';

// Port từ settings/conversationWorkflow/index.vue.
// ConversationRequiredAttributes (thuộc tính bắt buộc khi resolve) chưa port:
// cần custom attributes của E1 và cờ `conversation_required_attributes` là gói
// trả phí — thêm vào đây khi E1 xong.
export default function ConversationWorkflowIndex() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;
    const showAutoResolve = Boolean(currentAccount!.features?.auto_resolve_conversations);

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    header={
                        <BaseSettingsHeader
                            title={t('CONVERSATION_WORKFLOW.INDEX.HEADER.TITLE')}
                            description={t('CONVERSATION_WORKFLOW.INDEX.HEADER.DESCRIPTION')}
                            featureName="conversation-workflow"
                        />
                    }
                    body={
                        <div className="flex flex-col gap-6 mt-4">
                            {showAutoResolve ? <AutoResolve uiSettings={uiSettings} /> : null}
                        </div>
                    }
                />
            </SettingsWrapper>
        </Dashboard>
    );
}
