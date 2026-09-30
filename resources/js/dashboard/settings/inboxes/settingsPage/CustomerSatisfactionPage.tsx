import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, patchJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import Editor from 'dashboard/components-next/Editor/Editor';
import FilterSelect from 'dashboard/components-next/filter/inputs/FilterSelect';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import WithLabel from 'v3/components/Form/WithLabel';
import SettingsSaveBar from '../settingsDraft/SettingsSaveBar';
import { useSettingsDraft } from '../settingsDraft/useSettingsDraft';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/settingsPage/CustomerSatisfactionPage.vue @ v4.17.1.
// Bỏ toàn bộ nhánh mẫu WhatsApp Cloud / Twilio (kênh chưa port) và bộ phân tích
// utility của Captain (enterprise) — hai nhánh đó vào cùng tính năng của chúng.
// Không còn ô chọn kiểu hiển thị: khách luôn đánh giá bằng 3 nút ở widget lẫn trang khảo sát.
interface CustomerSatisfactionPageProps {
    inbox: Inbox;
    uiSettings: UISettings;
    onInboxUpdated: (inbox: Inbox) => void;
}

interface SurveyRules {
    operator?: string;
    values?: string[];
}

interface CsatConfig {
    message?: string;
    survey_rules?: SurveyRules;
}

interface CsatDraft {
    csatSurveyEnabled: boolean;
    message: string;
    surveyRuleOperator: string;
    selectedLabelValues: string[];
}

function csatDraftOf(inbox: Inbox): CsatDraft {
    const config = (inbox.csat_config ?? {}) as CsatConfig;

    return {
        csatSurveyEnabled: inbox.csat_survey_enabled || false,
        message: config.message ?? '',
        surveyRuleOperator: config.survey_rules?.operator ?? 'contains',
        selectedLabelValues: Array.isArray(config.survey_rules?.values) ? [...config.survey_rules.values] : [],
    };
}

export default function CustomerSatisfactionPage({
    inbox,
    uiSettings,
    onInboxUpdated,
}: CustomerSatisfactionPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const { draft, patchDraft, isDirty, isSaving, reset, save } = useSettingsDraft(csatDraftOf(inbox));
    const { csatSurveyEnabled, message, surveyRuleOperator, selectedLabelValues } = draft;
    const [labelTitles, setLabelTitles] = useState<string[]>([]);

    useEffect(() => {
        void getJson<{ payload: { title: string }[] }>(`/api/v1/accounts/${accountId}/labels`)
            .then(result => setLabelTitles(result.payload.map(label => label.title)))
            .catch(() => setLabelTitles([]));
    }, [accountId]);

    const filterTypes = [
        { label: t('INBOX_MGMT.CSAT.SURVEY_RULE.OPERATOR.CONTAINS'), value: 'contains' },
        { label: t('INBOX_MGMT.CSAT.SURVEY_RULE.OPERATOR.DOES_NOT_CONTAINS'), value: 'does_not_contain' },
    ];

    const labelOptions = useMemo(
        () =>
            labelTitles
                .filter(title => !selectedLabelValues.includes(title))
                .map(title => ({ label: title, value: title })),
        [labelTitles, selectedLabelValues],
    );

    const handleLabelSelect = (value: string) => {
        if (!value || selectedLabelValues.includes(value)) return;
        patchDraft({ selectedLabelValues: [...selectedLabelValues, value] });
    };

    const removeLabel = (label: string) =>
        patchDraft({ selectedLabelValues: selectedLabelValues.filter(value => value !== label) });

    const saveSettings = () =>
        save(async () => {
            try {
                const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                    csat_survey_enabled: csatSurveyEnabled,
                    // Giữ nguyên các khóa khác đã lưu (vd. display_type cũ), chỉ ghi phần trang này sửa.
                    csat_config: {
                        ...inbox.csat_config,
                        message,
                        survey_rules: { operator: surveyRuleOperator, values: selectedLabelValues },
                    },
                });
                onInboxUpdated(updated);
                useAlert(t('INBOX_MGMT.CSAT.API.SUCCESS_MESSAGE'));
                return true;
            } catch {
                useAlert(t('INBOX_MGMT.CSAT.API.ERROR_MESSAGE'));
                return false;
            }
        });

    return (
        <div className="mx-6">
            <SettingsToggleSection
                value={csatSurveyEnabled}
                header={t('INBOX_MGMT.CSAT.TITLE')}
                description={t('INBOX_MGMT.CSAT.SUBTITLE', {
                    poor: t('WIDGET.CONVERSATION_END.POOR'),
                    okay: t('WIDGET.CONVERSATION_END.OKAY'),
                    great: t('WIDGET.CONVERSATION_END.GREAT'),
                })}
                onChange={enabled => patchDraft({ csatSurveyEnabled: enabled })}
                editor={
                    csatSurveyEnabled ? (
                        <div className="grid gap-5">
                            <WithLabel label={t('INBOX_MGMT.CSAT.MESSAGE.LABEL')} name="message">
                                <Editor
                                    value={message}
                                    onChange={nextMessage => patchDraft({ message: nextMessage })}
                                    uiSettings={uiSettings}
                                    placeholder={t('INBOX_MGMT.CSAT.MESSAGE.PLACEHOLDER')}
                                    maxLength={200}
                                    className="w-full"
                                />
                            </WithLabel>

                            <WithLabel label={t('INBOX_MGMT.CSAT.SURVEY_RULE.LABEL')} name="survey_rule">
                                <div className="mb-4">
                                    <span className="inline-flex flex-wrap gap-1.5 items-center text-sm text-n-slate-12">
                                        {t('INBOX_MGMT.CSAT.SURVEY_RULE.DESCRIPTION_PREFIX')}
                                        <FilterSelect
                                            value={surveyRuleOperator}
                                            variant="faded"
                                            options={filterTypes}
                                            className="inline-flex shrink-0"
                                            onChange={operator => patchDraft({ surveyRuleOperator: operator })}
                                        />
                                        {t('INBOX_MGMT.CSAT.SURVEY_RULE.DESCRIPTION_SUFFIX')}
                                        {selectedLabelValues.map(label => (
                                            <Button
                                                key={label}
                                                sm
                                                faded
                                                slate
                                                trailingIcon
                                                label={label}
                                                icon="i-lucide-x"
                                                className="inline-flex shrink-0"
                                                onClick={() => removeLabel(label)}
                                            />
                                        ))}
                                        <FilterSelect
                                            value=""
                                            options={labelOptions}
                                            label={t('INBOX_MGMT.CSAT.SURVEY_RULE.SELECT_PLACEHOLDER')}
                                            hideLabel
                                            variant="faded"
                                            className="inline-flex shrink-0"
                                            onChange={handleLabelSelect}
                                        />
                                    </span>
                                </div>
                            </WithLabel>
                            <p className="text-sm italic text-n-slate-11">{t('INBOX_MGMT.CSAT.NOTE')}</p>
                        </div>
                    ) : null
                }
            />

            <SettingsSaveBar isDirty={isDirty} isSaving={isSaving} onCancel={reset} onSave={() => void saveSettings()} />
        </div>
    );
}
