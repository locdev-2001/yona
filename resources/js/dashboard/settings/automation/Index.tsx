import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson, parseApiErrorMessage, patchJson, postJson } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import type { DashboardPageProps } from '../../types';
import AutomationRuleForm from './AutomationRuleForm';
import AutomationRuleRow from './AutomationRuleRow';
import type { AutomationPayload } from './automationHelper';
import { DEFAULT_DELAY_MINUTES } from './constants';
import type { AutomationOptionSets, AutomationRule } from './types';

// Port từ settings/automation/Index.vue
const unwrap = <T,>(value: T | { payload: T }): T =>
    value && typeof value === 'object' && 'payload' in value ? (value as { payload: T }).payload : value as T;

const sortRules = (rules: AutomationRule[]) =>
    [...rules].sort((first, second) => (first.created_on ?? 0) - (second.created_on ?? 0));

type ListTab = 'instant' | 'delayed';

export default function AutomationIndex() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const uiSettings = auth.user?.ui_settings ?? {};
    const isDelayedAutomationsEnabled = Boolean(currentAccount.features?.delayed_automations);

    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [optionSets, setOptionSets] = useState<AutomationOptionSets>({ agents: [], teams: [], inboxes: [], labels: [] });
    const [isFetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<ListTab>('instant');
    const [showForm, setShowForm] = useState(false);
    const [formStartsWithWait, setFormStartsWithWait] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [deletingRule, setDeletingRule] = useState<AutomationRule | null>(null);
    const [togglingRule, setTogglingRule] = useState<AutomationRule | null>(null);
    const [loadingIds, setLoadingIds] = useState<number[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [ruleResponse, agents, teams, inboxResponse, labelResponse] = await Promise.all([
                    getJson<{ payload: AutomationRule[] }>(`/api/v1/accounts/${accountId}/automation_rules`),
                    getJson<Array<{ id: number; name: string }>>(`/api/v1/accounts/${accountId}/agents`),
                    getJson<Array<{ id: number; name: string }>>(`/api/v1/accounts/${accountId}/teams`),
                    getJson<{ payload: Array<{ id: number; name: string }> }>(`/api/v1/accounts/${accountId}/inboxes`),
                    getJson<{ payload: Array<{ id: number; title: string; color: string }> }>(`/api/v1/accounts/${accountId}/labels`),
                ]);
                if (!active) return;
                setRules(sortRules(ruleResponse.payload ?? []));
                setOptionSets({
                    agents: agents.map(item => ({ id: item.id, name: item.name })),
                    teams: teams.map(item => ({ id: item.id, name: item.name })),
                    inboxes: (inboxResponse.payload ?? []).map(item => ({ id: item.id, name: item.name })),
                    labels: (labelResponse.payload ?? []).map(item => ({ id: item.title, name: item.title, color: item.color })),
                });
            } catch (error) {
                if (active) useAlert(parseApiErrorMessage(error) || t('AUTOMATION.LOADING'));
            } finally {
                if (active) setFetching(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [accountId]);

    const filteredRules = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return rules;
        return picoSearch(rules, query, ['name', 'description']);
    }, [rules, searchQuery]);

    const instantRules = filteredRules.filter(rule => !rule.execution_delay);
    const delayedRules = filteredRules.filter(rule => rule.execution_delay);
    const hasDelayedRules = rules.some(rule => rule.execution_delay);
    // Account không tạo được rule chờ và cũng không còn rule chờ nào chỉ thấy danh sách phẳng.
    const showTabs = isDelayedAutomationsEnabled || hasDelayedRules;
    const showDelayDisabledBanner = !isDelayedAutomationsEnabled && hasDelayedRules;
    const visibleRules = !showTabs ? filteredRules : activeTab === 'delayed' ? delayedRules : instantRules;

    const tabs = [
        { value: 'instant', label: t('AUTOMATION.LIST.TABS.INSTANT'), count: instantRules.length },
        { value: 'delayed', label: t('AUTOMATION.LIST.TABS.DELAYED'), count: delayedRules.length },
    ];
    const activeTabIndex = tabs.findIndex(tab => tab.value === activeTab);

    const noDataMessage = searchQuery
        ? t('AUTOMATION.NO_RESULTS')
        : showTabs && activeTab === 'delayed' ? t('AUTOMATION.LIST.404_DELAYED') : t('AUTOMATION.LIST.404');

    const openAddPopup = () => {
        setEditingRule(null);
        setFormStartsWithWait(isDelayedAutomationsEnabled && activeTab === 'delayed');
        setShowForm(true);
    };
    const openEditPopup = (rule: AutomationRule) => { setEditingRule(rule); setShowForm(true); };
    const closeForm = () => setShowForm(false);

    const submitAutomation = async (payload: AutomationPayload, mode: 'create' | 'edit') => {
        try {
            if (mode === 'edit' && editingRule) {
                const response = await patchJson<{ payload: AutomationRule }>(`/api/v1/accounts/${accountId}/automation_rules/${editingRule.id}`, { ...payload });
                setRules(current => current.map(rule => rule.id === editingRule.id ? unwrap(response) : rule));
                useAlert(t('AUTOMATION.EDIT.API.SUCCESS_MESSAGE'));
            } else {
                const response = await postJson<AutomationRule>(`/api/v1/accounts/${accountId}/automation_rules`, { ...payload });
                setRules(current => sortRules([...current, unwrap(response)]));
                useAlert(t('AUTOMATION.ADD.API.SUCCESS_MESSAGE'));
            }
            closeForm();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t(mode === 'edit' ? 'AUTOMATION.EDIT.API.ERROR_MESSAGE' : 'AUTOMATION.ADD.API.ERROR_MESSAGE'));
            throw error;
        }
    };

    const withLoading = async (id: number, callback: () => Promise<void>) => {
        setLoadingIds(current => [...current, id]);
        try { await callback(); } finally { setLoadingIds(current => current.filter(item => item !== id)); }
    };

    const confirmToggle = async () => {
        const rule = togglingRule;
        if (!rule) return;
        setTogglingRule(null);
        await withLoading(rule.id, async () => {
            try {
                const response = await patchJson<{ payload: AutomationRule }>(`/api/v1/accounts/${accountId}/automation_rules/${rule.id}`, { active: !rule.active });
                const updated = unwrap(response);
                setRules(current => current.map(item => item.id === rule.id ? updated : item));
                useAlert(t(rule.active ? 'AUTOMATION.TOGGLE.DEACTIVATION_SUCCESFUL' : 'AUTOMATION.TOGGLE.ACTIVATION_SUCCESFUL'));
            } catch (error) {
                useAlert(parseApiErrorMessage(error) || t('AUTOMATION.EDIT.API.ERROR_MESSAGE'));
            }
        });
    };

    const cloneRule = async (rule: AutomationRule) => {
        await withLoading(rule.id, async () => {
            try {
                const response = await postJson<{ payload: AutomationRule }>(`/api/v1/accounts/${accountId}/automation_rules/${rule.id}/clone`, {});
                setRules(current => sortRules([...current, unwrap(response)]));
                useAlert(t('AUTOMATION.CLONE.API.SUCCESS_MESSAGE'));
            } catch (error) {
                useAlert(parseApiErrorMessage(error) || t('AUTOMATION.CLONE.API.ERROR_MESSAGE'));
            }
        });
    };

    const deleteRule = async () => {
        const rule = deletingRule;
        if (!rule) return;
        setDeletingRule(null);
        await withLoading(rule.id, async () => {
            try {
                await deleteJson(`/api/v1/accounts/${accountId}/automation_rules/${rule.id}`);
                setRules(current => current.filter(item => item.id !== rule.id));
                useAlert(t('AUTOMATION.DELETE.API.SUCCESS_MESSAGE'));
            } catch (error) {
                useAlert(parseApiErrorMessage(error) || t('AUTOMATION.DELETE.API.ERROR_MESSAGE'));
            }
        });
    };

    const headers = [t('AUTOMATION.LIST.TABLE_HEADER.NAME'), t('AUTOMATION.LIST.TABLE_HEADER.ACTIVE'), t('AUTOMATION.LIST.TABLE_HEADER.CREATED_ON'), t('AUTOMATION.LIST.TABLE_HEADER.ACTIONS')];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('AUTOMATION.LOADING')}
                    noRecordsFound={!rules.length}
                    noRecordsMessage={t('AUTOMATION.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('AUTOMATION.HEADER')}
                            description={t('AUTOMATION.DESCRIPTION')}
                            linkText={t('AUTOMATION.LEARN_MORE')}
                            featureName="automation"
                            searchPlaceholder={t('AUTOMATION.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            tabs={showTabs ? <TabBar tabs={tabs} initialActiveTab={activeTabIndex} onTabChanged={tab => setActiveTab(tab.value as ListTab)} /> : null}
                            count={visibleRules.length ? <span className="text-body-main text-n-slate-11">{t('AUTOMATION.COUNT', { n: visibleRules.length })}</span> : null}
                            actions={<Button size="sm" label={t('AUTOMATION.HEADER_BTN_TXT')} onClick={openAddPopup} />}
                        />
                    }
                    body={
                        <>
                            {showDelayDisabledBanner ? (
                                <div className="px-4 py-3 mb-4 text-sm rounded-lg bg-n-amber-3 text-n-amber-12">{t('AUTOMATION.LIST.DELAY_DISABLED_BANNER')}</div>
                            ) : null}
                            <BaseTable headers={headers} hasItems={visibleRules.length > 0} noDataMessage={noDataMessage}>
                                {visibleRules.map(rule => (
                                    <AutomationRuleRow key={rule.id} rule={rule} loading={loadingIds.includes(rule.id)} onToggle={() => setTogglingRule(rule)} onEdit={() => openEditPopup(rule)} onClone={() => void cloneRule(rule)} onDelete={() => setDeletingRule(rule)} />
                                ))}
                            </BaseTable>
                        </>
                    }
                />
            </SettingsWrapper>

            <AutomationRuleForm
                open={showForm}
                mode={editingRule ? 'edit' : 'create'}
                rule={editingRule}
                initialExecutionDelay={formStartsWithWait ? DEFAULT_DELAY_MINUTES : null}
                optionSets={optionSets}
                allowsDelayedExecution={isDelayedAutomationsEnabled}
                uiSettings={uiSettings}
                onClose={closeForm}
                onSave={submitAutomation}
            />
            <DeleteModal show={deletingRule !== null} onClose={() => setDeletingRule(null)} onConfirm={() => void deleteRule()} title={t('LABEL_MGMT.DELETE.CONFIRM.TITLE')} message={t('AUTOMATION.DELETE.CONFIRM.MESSAGE')} messageValue={` ${deletingRule?.name ?? ''}?`} confirmText={`${t('AUTOMATION.DELETE.CONFIRM.YES')} ${deletingRule?.name ?? ''}`} rejectText={`${t('AUTOMATION.DELETE.CONFIRM.NO')} ${deletingRule?.name ?? ''}`} />
            <Modal show={togglingRule !== null} onClose={() => setTogglingRule(null)}>
                <ModalHeader headerTitle={t(togglingRule?.active ? 'AUTOMATION.TOGGLE.DEACTIVATION_TITLE' : 'AUTOMATION.TOGGLE.ACTIVATION_TITLE')} headerContent={t(togglingRule?.active ? 'AUTOMATION.TOGGLE.DEACTIVATION_DESCRIPTION' : 'AUTOMATION.TOGGLE.ACTIVATION_DESCRIPTION', { automationName: togglingRule?.name ?? '' })} />
                <div className="flex items-center justify-end gap-2 p-8"><Button faded slate label={t('AUTOMATION.TOGGLE.CANCEL_LABEL')} onClick={() => setTogglingRule(null)} /><Button blue label={t('AUTOMATION.TOGGLE.CONFIRMATION_LABEL')} onClick={() => void confirmToggle()} /></div>
            </Modal>
        </Dashboard>
    );
}
