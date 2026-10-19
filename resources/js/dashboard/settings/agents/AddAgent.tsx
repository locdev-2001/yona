import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { ApiError, postJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import ModalHeader from 'dashboard/components/ModalHeader';
import type { Agent } from './types';

// Port từ dashboard/routes/dashboard/settings/agents/AddAgent.vue
// (custom role = EE nên chỉ còn agent/administrator).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddAgentProps {
    accountId: number;
    onClose: () => void;
    onCreated: (agent: Agent) => void;
}

export default function AddAgent({ accountId, onClose, onCreated }: AddAgentProps) {
    const [agentName, setAgentName] = useState('');
    const [agentEmail, setAgentEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<Agent['role']>('agent');
    const [touched, setTouched] = useState({ name: false, email: false });
    const [isCreating, setCreating] = useState(false);

    const nameInvalid = !agentName;
    const emailInvalid = !agentEmail || !EMAIL_REGEX.test(agentEmail);

    const roles: { id: Agent['role']; label: string }[] = [
        { id: 'administrator', label: t('AGENT_MGMT.AGENT_TYPES.ADMINISTRATOR') },
        { id: 'agent', label: t('AGENT_MGMT.AGENT_TYPES.AGENT') },
    ];

    const addAgent = async (event: FormEvent) => {
        event.preventDefault();
        setTouched({ name: true, email: true });
        if (nameInvalid || emailInvalid) return;

        setCreating(true);
        try {
            const agent = await postJson<Agent>(`/api/v1/accounts/${accountId}/agents`, {
                name: agentName,
                email: agentEmail,
                role: selectedRole,
            });
            onCreated(agent);
            useAlert(t('AGENT_MGMT.ADD.API.SUCCESS_MESSAGE'));
            onClose();
        } catch (error) {
            const isDuplicate = error instanceof ApiError && error.status === 422;
            useAlert(
                isDuplicate ? t('AGENT_MGMT.ADD.API.EXIST_MESSAGE') : t('AGENT_MGMT.ADD.API.ERROR_MESSAGE'),
            );
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader headerTitle={t('AGENT_MGMT.ADD.TITLE')} headerContent={t('AGENT_MGMT.ADD.DESC')} />
            <form className="flex flex-col items-start w-full" onSubmit={event => void addAgent(event)}>
                <div className="w-full">
                    <label className={touched.name && nameInvalid ? 'error' : undefined}>
                        {t('AGENT_MGMT.ADD.FORM.NAME.LABEL')}
                        <input
                            type="text"
                            value={agentName}
                            placeholder={t('AGENT_MGMT.ADD.FORM.NAME.PLACEHOLDER')}
                            className={touched.name && nameInvalid ? 'error' : undefined}
                            onChange={event => {
                                setAgentName(event.target.value);
                                setTouched(current => ({ ...current, name: true }));
                            }}
                        />
                    </label>
                </div>

                <div className="w-full">
                    <label>
                        {t('AGENT_MGMT.ADD.FORM.AGENT_TYPE.LABEL')}
                        <select
                            value={selectedRole}
                            onChange={event => setSelectedRole(event.target.value as Agent['role'])}
                        >
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="w-full">
                    <label className={touched.email && emailInvalid ? 'error' : undefined}>
                        {t('AGENT_MGMT.ADD.FORM.EMAIL.LABEL')}
                        <input
                            type="email"
                            value={agentEmail}
                            placeholder={t('AGENT_MGMT.ADD.FORM.EMAIL.PLACEHOLDER')}
                            className={touched.email && emailInvalid ? 'error' : undefined}
                            onChange={event => {
                                setAgentEmail(event.target.value);
                                setTouched(current => ({ ...current, email: true }));
                            }}
                        />
                    </label>
                </div>

                <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                    <Button
                        faded
                        slate
                        type="reset"
                        label={t('AGENT_MGMT.ADD.CANCEL_BUTTON_TEXT')}
                        onClick={event => {
                            event.preventDefault();
                            onClose();
                        }}
                    />
                    <Button
                        type="submit"
                        label={t('AGENT_MGMT.ADD.FORM.SUBMIT')}
                        disabled={nameInvalid || emailInvalid || isCreating}
                        isLoading={isCreating}
                    />
                </div>
            </form>
        </div>
    );
}
