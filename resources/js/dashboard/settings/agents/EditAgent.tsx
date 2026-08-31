import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { postJson, putJson } from 'dashboard/helper/apiClient';
import { AVAILABILITY_STATUS_KEYS } from 'dashboard/constants/globals';
import Button from 'dashboard/components-next/button/Button';
import ModalHeader from 'dashboard/components/ModalHeader';
import type { Agent } from './types';

// Port từ dashboard/routes/dashboard/settings/agents/EditAgent.vue
// (custom role = EE; nhánh provider 'saml' cũng EE nên nút reset luôn hiện).
interface EditAgentProps {
    accountId: number;
    agent: Agent;
    onClose: () => void;
    onUpdated: (agent: Agent) => void;
}

export default function EditAgent({ accountId, agent, onClose, onUpdated }: EditAgentProps) {
    const [agentName, setAgentName] = useState(agent.name);
    const [availability, setAvailability] = useState(agent.availability_status);
    const [role, setRole] = useState(agent.role);
    const [isUpdating, setUpdating] = useState(false);

    const nameInvalid = !agentName;

    const roles: { id: Agent['role']; label: string }[] = [
        { id: 'administrator', label: t('AGENT_MGMT.AGENT_TYPES.ADMINISTRATOR') },
        { id: 'agent', label: t('AGENT_MGMT.AGENT_TYPES.AGENT') },
    ];

    const availabilityLabels = [
        t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.ONLINE'),
        t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.BUSY'),
        t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.OFFLINE'),
    ];

    const editAgent = async (event: FormEvent) => {
        event.preventDefault();
        if (nameInvalid) return;

        setUpdating(true);
        try {
            const updated = await putJson<Agent>(`/api/v1/accounts/${accountId}/agents/${agent.id}`, {
                name: agentName,
                availability,
                role,
            });
            onUpdated(updated);
            useAlert(t('AGENT_MGMT.EDIT.API.SUCCESS_MESSAGE'));
            onClose();
        } catch {
            useAlert(t('AGENT_MGMT.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    const resetPassword = async () => {
        try {
            await postJson('/app/auth/password', { email: agent.email });
            useAlert(t('AGENT_MGMT.EDIT.PASSWORD_RESET.ADMIN_SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('AGENT_MGMT.EDIT.PASSWORD_RESET.ERROR_MESSAGE'));
        }
    };

    return (
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader headerTitle={`${t('AGENT_MGMT.EDIT.TITLE')} - ${agent.name}`} />
            <form className="w-full" onSubmit={event => void editAgent(event)}>
                <div className="w-full">
                    <label className={nameInvalid ? 'error' : undefined}>
                        {t('AGENT_MGMT.EDIT.FORM.NAME.LABEL')}
                        <input
                            type="text"
                            value={agentName}
                            placeholder={t('AGENT_MGMT.EDIT.FORM.NAME.PLACEHOLDER')}
                            className={nameInvalid ? 'error' : undefined}
                            onChange={event => setAgentName(event.target.value)}
                        />
                    </label>
                </div>

                <div className="w-full">
                    <label>
                        {t('AGENT_MGMT.EDIT.FORM.AGENT_TYPE.LABEL')}
                        <select value={role} onChange={event => setRole(event.target.value as Agent['role'])}>
                            {roles.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="w-full">
                    <label>
                        {t('PROFILE_SETTINGS.FORM.AVAILABILITY.LABEL')}
                        <select
                            value={availability}
                            onChange={event =>
                                setAvailability(event.target.value as Agent['availability_status'])
                            }
                        >
                            {AVAILABILITY_STATUS_KEYS.map((statusKey, index) => (
                                <option
                                    key={statusKey}
                                    value={statusKey}
                                    disabled={agent.availability_status === statusKey}
                                >
                                    {availabilityLabels[index]}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="flex flex-row justify-start w-full gap-2 px-0 py-2">
                    <div className="w-[50%] ltr:text-left rtl:text-right">
                        <Button
                            ghost
                            type="button"
                            icon="i-lucide-lock-keyhole"
                            className="!px-2"
                            label={t('AGENT_MGMT.EDIT.PASSWORD_RESET.ADMIN_RESET_BUTTON')}
                            onClick={event => {
                                event.preventDefault();
                                void resetPassword();
                            }}
                        />
                    </div>
                    <div className="w-[50%] flex justify-end items-center gap-2">
                        <Button
                            faded
                            slate
                            type="reset"
                            label={t('AGENT_MGMT.EDIT.CANCEL_BUTTON_TEXT')}
                            onClick={event => {
                                event.preventDefault();
                                onClose();
                            }}
                        />
                        <Button
                            type="submit"
                            label={t('AGENT_MGMT.EDIT.FORM.SUBMIT')}
                            disabled={nameInvalid || isUpdating}
                            isLoading={isUpdating}
                        />
                    </div>
                </div>
            </form>
        </div>
    );
}
