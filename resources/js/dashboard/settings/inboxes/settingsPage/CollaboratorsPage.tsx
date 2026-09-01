import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, patchJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import TagInput from 'dashboard/components-next/taginput/TagInput';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DashboardPageProps } from '../../../types';
import type { Agent, Inbox } from '../types';

// Port từ settings/inbox/settingsPage/CollaboratorsPage.vue — nhánh CE:
// assignment_v2/advanced_assignment (EE) + max_assignment_limit (enterprise) bỏ.
interface CollaboratorsPageProps {
    inbox: Inbox;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function CollaboratorsPage({ inbox, onInboxUpdated }: CollaboratorsPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

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
                    header={t('INBOX_MGMT.SETTINGS_POPUP.AUTO_ASSIGNMENT')}
                    description={t('INBOX_MGMT.SETTINGS_POPUP.AUTO_ASSIGNMENT_SUB_TEXT')}
                    value={enableAutoAssignment}
                    onChange={value => void handleToggleAutoAssignment(value)}
                />
            </SettingsAccordion>
        </div>
    );
}
