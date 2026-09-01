import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingsSubPageHeader from '../SettingsSubPageHeader';
import WizardLayout, { INBOX_WIZARD_ROUTES } from './WizardLayout';
import Button from 'dashboard/components-next/button/Button';
import TagInput from 'dashboard/components-next/taginput/TagInput';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DashboardPageProps } from '../../types';
import type { Agent } from './types';

// Port từ settings/inbox/AddAgents.vue — bước 3 gán agent cho inbox mới.
interface AddAgentsProps {
    inboxId: number;
}

export default function AddAgents({ inboxId }: AddAgentsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [agentList, setAgentList] = useState<Agent[]>([]);
    const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
    const [isTouched, setTouched] = useState(false);
    const [isCreating, setCreating] = useState(false);

    useEffect(() => {
        void getJson<Agent[]>(`/api/v1/accounts/${accountId}/agents`).then(setAgentList);
    }, [accountId]);

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

    const addAgents = async (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (!selectedAgentIds.length) return;

        setCreating(true);
        try {
            await patchJson(`/api/v1/accounts/${accountId}/inbox_members`, {
                inbox_id: inboxId,
                user_ids: selectedAgentIds,
            });
            window.location.replace(accountScopedUrl(accountId, `settings/inboxes/new/${inboxId}/finish`));
        } catch (error) {
            setCreating(false);
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
        }
    };

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <WizardLayout activeRoute={INBOX_WIZARD_ROUTES.AGENT}>
                    <div className="h-full w-full p-6 col-span-6">
                        <form className="flex flex-wrap flex-col mx-0" onSubmit={event => void addAgents(event)}>
                            <div className="w-full">
                                <SettingsSubPageHeader
                                    headerTitle={t('INBOX_MGMT.ADD.AGENTS.TITLE')}
                                    headerContent={t('INBOX_MGMT.ADD.AGENTS.DESC')}
                                />
                            </div>
                            <div>
                                <div className="w-full mb-4">
                                    <label className={isTouched && !selectedAgentIds.length ? 'error' : ''}>
                                        {t('INBOX_MGMT.ADD.AGENTS.TITLE')}
                                        <div
                                            data-testid="agent-selector"
                                            className="rounded-xl outline outline-1 -outline-offset-1 outline-n-weak hover:outline-n-strong px-2 py-2"
                                        >
                                            <TagInput
                                                value={selectedAgentNames}
                                                placeholder={t('INBOX_MGMT.ADD.AGENTS.PICK_AGENTS')}
                                                menuItems={agentMenuItems}
                                                onAdd={item => {
                                                    const id = Number(item.value);
                                                    setSelectedAgentIds(current =>
                                                        current.includes(id) ? current : [...current, id],
                                                    );
                                                }}
                                                onRemove={index => {
                                                    setSelectedAgentIds(current =>
                                                        current.filter((_, itemIndex) => itemIndex !== index),
                                                    );
                                                }}
                                            />
                                        </div>
                                        {isTouched && !selectedAgentIds.length ? (
                                            <span className="message">
                                                {t('INBOX_MGMT.ADD.AGENTS.VALIDATION_ERROR')}
                                            </span>
                                        ) : null}
                                    </label>
                                </div>
                                <div className="w-full">
                                    <Button
                                        type="submit"
                                        isLoading={isCreating}
                                        solid
                                        blue
                                        label={t('INBOX_MGMT.AGENTS.BUTTON_TEXT')}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                </WizardLayout>
            </SettingsContent>
        </Dashboard>
    );
}
