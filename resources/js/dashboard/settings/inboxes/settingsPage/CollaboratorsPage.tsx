import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, patchJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import TagInput from 'dashboard/components-next/taginput/TagInput';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DashboardPageProps } from '../../../types';
import type { Agent, Inbox } from '../types';

// Port từ settings/inbox/settingsPage/CollaboratorsPage.vue @ v4.17.1.
// Rẽ nhánh theo feature flag account như bản gốc: assignment_v2 (default BẬT)
// hiện card "Default assignment rules". Yona chưa có gói cước nên không có lời
// mời nâng cấp; UI policy picker (advanced_assignment) + ô max_assignment_limit
// port khi các feature đó vào.
interface CollaboratorsPageProps {
    inbox: Inbox;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function CollaboratorsPage({ inbox, onInboxUpdated }: CollaboratorsPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const features = currentAccount!.features ?? {};
    const hasAssignmentV2 = Boolean(features.assignment_v2);

    const [agentList, setAgentList] = useState<Agent[]>([]);
    const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
    const [isAgentListUpdating, setAgentListUpdating] = useState(false);
    const [enableAutoAssignment, setEnableAutoAssignment] = useState(inbox.enable_auto_assignment);

    useEffect(() => {
        void getJson<Agent[]>(`/api/v1/accounts/${accountId}/agents`).then(setAgentList);
    }, [accountId]);

    useEffect(() => {
        setEnableAutoAssignment(inbox.enable_auto_assignment);
        void getJson<{ payload: Agent[] }>(`/api/v1/accounts/${accountId}/inbox_members/${inbox.id}`).then(
            response => setSelectedAgentIds(response.payload.map(member => member.id)),
        );
    }, [accountId, inbox.id, inbox.enable_auto_assignment]);

    const selectedAgentNames = selectedAgentIds.map(
        id => agentList.find(agent => agent.id === id)?.name ?? '',
    );

    const agentMenuItems: DropdownMenuItem[] = agentList
        .filter(({ id }) => !selectedAgentIds.includes(id))
        .map(({ id, name, thumbnail }) => ({
            label: name,
            value: id,
            action: 'select',
            thumbnail: { name, src: thumbnail || '' },
        }));

    const updateAgents = async () => {
        setAgentListUpdating(true);
        try {
            await patchJson(`/api/v1/accounts/${accountId}/inbox_members`, {
                inbox_id: inbox.id,
                user_ids: selectedAgentIds,
            });
            useAlert(t('AGENT_MGMT.EDIT.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('AGENT_MGMT.EDIT.API.ERROR_MESSAGE'));
        }
        setAgentListUpdating(false);
    };

    const handleToggleAutoAssignment = async (value: boolean) => {
        setEnableAutoAssignment(value);
        try {
            const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                enable_auto_assignment: value,
            });
            onInboxUpdated(updated);
            useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
        }
    };

    return (
        <div>
            <SettingsFieldSection
                label={t('INBOX_MGMT.SETTINGS_POPUP.INBOX_AGENTS')}
                helpText={t('INBOX_MGMT.SETTINGS_POPUP.INBOX_AGENTS_SUB_TEXT')}
                className="[&>div]:!items-start"
                extra={
                    <div className="grid grid-cols-1 lg:grid-cols-8">
                        <div className="col-span-1 lg:col-span-2" />
                        <div className="col-span-1 lg:col-span-6 mt-4 justify-self-end">
                            <Button
                                label={t('INBOX_MGMT.SETTINGS_POPUP.UPDATE')}
                                isLoading={isAgentListUpdating}
                                onClick={() => void updateAgents()}
                            />
                        </div>
                    </div>
                }
            >
                <div className="rounded-xl outline outline-1 -outline-offset-1 outline-n-weak hover:outline-n-strong px-2 py-2">
                    <TagInput
                        value={selectedAgentNames}
                        placeholder={t('INBOX_MGMT.ADD.AGENTS.PICK_AGENTS')}
                        menuItems={agentMenuItems}
                        autoOpenDropdown={false}
                        onAdd={item => {
                            const id = Number(item.value);
                            setSelectedAgentIds(current => (current.includes(id) ? current : [...current, id]));
                        }}
                        onRemove={index =>
                            setSelectedAgentIds(current => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                    />
                </div>
            </SettingsFieldSection>
            <SettingsAccordion title={t('INBOX_MGMT.SETTINGS_POPUP.AGENT_ASSIGNMENT')} className="mt-6">
                <SettingsToggleSection
                    compact
                    header={
                        hasAssignmentV2
                            ? t('INBOX_MGMT.ASSIGNMENT.ENABLE_AUTO_ASSIGNMENT')
                            : t('INBOX_MGMT.SETTINGS_POPUP.AUTO_ASSIGNMENT')
                    }
                    description={
                        hasAssignmentV2
                            ? t('INBOX_MGMT.ASSIGNMENT.DESCRIPTION')
                            : t('INBOX_MGMT.SETTINGS_POPUP.AUTO_ASSIGNMENT_SUB_TEXT')
                    }
                    value={enableAutoAssignment}
                    onChange={value => void handleToggleAutoAssignment(value)}
                    editor={
                        enableAutoAssignment && hasAssignmentV2 ? (
                            <div className="ltr:pr-0 rtl:pl-0 ltr:pl-4 rtl:pr-4 py-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 size-10 rounded-xl bg-n-slate-3 dark:bg-n-slate-4 flex items-center justify-center">
                                        <Icon icon="i-lucide-zap" className="text-xl text-n-slate-11" />
                                    </div>
                                    <div className="flex-grow">
                                        <h4 className="text-heading-3 text-n-slate-12 mb-0.5">
                                            {t('INBOX_MGMT.ASSIGNMENT.DEFAULT_RULES_TITLE')}
                                        </h4>
                                        <p className="text-body-main text-n-slate-11 mb-4">
                                            {t('INBOX_MGMT.ASSIGNMENT.DEFAULT_RULES_DESCRIPTION')}
                                        </p>

                                        <ul className="space-y-2 list-none p-0">
                                            <li className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-n-slate-11 flex-shrink-0" />
                                                <span className="text-body-main text-n-slate-12">
                                                    {t('INBOX_MGMT.ASSIGNMENT.DEFAULT_RULE_1')}
                                                </span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-n-slate-11 flex-shrink-0" />
                                                <span className="text-body-main text-n-slate-12">
                                                    {t('INBOX_MGMT.ASSIGNMENT.DEFAULT_RULE_2')}
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : undefined
                    }
                />
            </SettingsAccordion>
        </div>
    );
}
