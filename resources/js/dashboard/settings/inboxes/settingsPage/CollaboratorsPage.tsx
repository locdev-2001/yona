import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, patchJson } from 'dashboard/helper/apiClient';
import Icon from 'dashboard/components-next/icon/Icon';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import TagInput from 'dashboard/components-next/taginput/TagInput';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import SettingsSaveBar from '../settingsDraft/SettingsSaveBar';
import { useSettingsDraft } from '../settingsDraft/useSettingsDraft';
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
    const [memberIds, setMemberIds] = useState<number[]>([]);
    const { draft, patchDraft, isDirty, isSaving, reset, save } = useSettingsDraft({
        selectedAgentIds: memberIds,
        enableAutoAssignment: inbox.enable_auto_assignment,
    });
    const { selectedAgentIds, enableAutoAssignment } = draft;

    useEffect(() => {
        void getJson<Agent[]>(`/api/v1/accounts/${accountId}/agents`).then(setAgentList);
    }, [accountId]);

    useEffect(() => {
        void getJson<{ payload: Agent[] }>(`/api/v1/accounts/${accountId}/inbox_members/${inbox.id}`).then(response =>
            setMemberIds(response.payload.map(member => member.id)),
        );
    }, [accountId, inbox.id]);

    const selectedAgentNames = selectedAgentIds.map(id => agentList.find(agent => agent.id === id)?.name ?? '');

    const agentMenuItems: DropdownMenuItem[] = agentList
        .filter(({ id }) => !selectedAgentIds.includes(id))
        .map(({ id, name, thumbnail }) => ({
            label: name,
            value: id,
            action: 'select',
            thumbnail: { name, src: thumbnail || '' },
        }));

    // Thành viên và tự động giao nằm ở hai endpoint; chỉ gửi phần đã đổi.
    const saveCollaborators = () =>
        save(async submitted => {
            try {
                if (JSON.stringify(submitted.selectedAgentIds) !== JSON.stringify(memberIds)) {
                    await patchJson(`/api/v1/accounts/${accountId}/inbox_members`, {
                        inbox_id: inbox.id,
                        user_ids: submitted.selectedAgentIds,
                    });
                    setMemberIds(submitted.selectedAgentIds);
                }
                if (submitted.enableAutoAssignment !== inbox.enable_auto_assignment) {
                    const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                        enable_auto_assignment: submitted.enableAutoAssignment,
                    });
                    onInboxUpdated(updated);
                }
                useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
                return true;
            } catch {
                useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
                return false;
            }
        });

    return (
        <div>
            <SettingsFieldSection
                label={t('INBOX_MGMT.SETTINGS_POPUP.INBOX_AGENTS')}
                helpText={t('INBOX_MGMT.SETTINGS_POPUP.INBOX_AGENTS_SUB_TEXT')}
                className="[&>div]:!items-start"
            >
                <div className="rounded-xl outline outline-1 -outline-offset-1 outline-n-weak hover:outline-n-strong px-2 py-2">
                    <TagInput
                        value={selectedAgentNames}
                        placeholder={t('INBOX_MGMT.ADD.AGENTS.PICK_AGENTS')}
                        menuItems={agentMenuItems}
                        autoOpenDropdown={false}
                        onAdd={item => {
                            const id = Number(item.value);
                            if (!selectedAgentIds.includes(id)) patchDraft({ selectedAgentIds: [...selectedAgentIds, id] });
                        }}
                        onRemove={index =>
                            patchDraft({ selectedAgentIds: selectedAgentIds.filter((_, itemIndex) => itemIndex !== index) })
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
                    onChange={value => patchDraft({ enableAutoAssignment: value })}
                    editor={
                        enableAutoAssignment && hasAssignmentV2 ? (
                            <div className="ltr:pr-0 rtl:pl-0 ltr:pl-4 rtl:pr-4 py-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 size-10 rounded-xl bg-n-slate-3 flex items-center justify-center">
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
            <SettingsSaveBar isDirty={isDirty} isSaving={isSaving} onCancel={reset} onSave={() => void saveCollaborators()} />
        </div>
    );
}
