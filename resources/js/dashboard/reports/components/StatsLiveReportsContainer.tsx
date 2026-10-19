import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import DropdownMenu, { type DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { OVERVIEW_METRICS } from '../constants';
import { useAccountDirectory } from '../composables/useAccountDirectory';
import { useLiveRefresh } from '../composables/useLiveRefresh';
import { fetchAccountConversationMetric, reportsSelectors, useReportsState } from '../store';
import MetricCard from './overview/MetricCard';

// Port từ reports/components/StatsLiveReportsContainer.vue — getter
// `agents/getAgentStatus` tính tại chỗ từ danh sách agent của tài khoản.
const ACCOUNT_I18N_KEY = 'OVERVIEW_REPORTS.ACCOUNT_CONVERSATIONS';

export default function StatsLiveReportsContainer() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const uiFlags = useReportsState(reportsSelectors.overviewUIFlags);
    const accountConversationMetric = useReportsState(reportsSelectors.accountConversationMetric);
    const { agents, teams } = useAccountDirectory(accountId, ['agents', 'teams']);

    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useClickAway(dropdownRef, () => setShowDropdown(false), showDropdown);

    const teamMenuList: DropdownMenuItem[] = useMemo(
        () => [
            { label: t('OVERVIEW_REPORTS.TEAM_CONVERSATIONS.ALL_TEAMS'), value: 0, action: 'select_team' },
            ...teams.map(team => ({ label: team.name, value: team.id, action: 'select_team' })),
        ],
        [teams],
    );

    const agentStatusMetrics = useMemo(() => {
        const status: Record<string, number> = {
            online: agents.filter(agent => agent.availability_status === 'online').length,
            busy: agents.filter(agent => agent.availability_status === 'busy').length,
            offline: agents.filter(agent => agent.availability_status === 'offline').length,
        };
        return Object.entries(status).map(([key, value]) => [
            t(`OVERVIEW_REPORTS.AGENT_STATUS.${OVERVIEW_METRICS[key]}`),
            value,
        ]) as Array<[string, number]>;
    }, [agents]);

    const conversationMetrics = useMemo(
        () =>
            Object.entries(accountConversationMetric).map(([key, value]) => [
                t(`${ACCOUNT_I18N_KEY}.${OVERVIEW_METRICS[key]}`),
                value ?? 0,
            ]) as Array<[string, number]>,
        [accountConversationMetric],
    );

    const selectedTeamLabel = teamMenuList.find(item => item.value === (selectedTeam ?? 0))?.label ?? '';

    useEffect(() => {
        void fetchAccountConversationMetric(accountId, selectedTeam ? { team_id: selectedTeam } : {});
    }, [accountId, selectedTeam]);

    useLiveRefresh(() =>
        fetchAccountConversationMetric(accountId, selectedTeam ? { team_id: selectedTeam } : {}),
    );

    return (
        <div className="flex flex-col items-center md:flex-row gap-4">
            <div className="flex-1 w-full max-w-full md:w-[65%] md:max-w-[65%] conversation-metric">
                <MetricCard
                    header={t(`${ACCOUNT_I18N_KEY}.HEADER`)}
                    isLoading={uiFlags.isFetchingAccountConversationMetric}
                    loadingMessage={t(`${ACCOUNT_I18N_KEY}.LOADING_MESSAGE`)}
                    control={
                        isProductFeatureVisible('teams') && teams.length ? (
                            <div ref={dropdownRef} className="relative flex items-center group z-50">
                                <Button
                                    sm
                                    slate
                                    faded
                                    label={selectedTeamLabel}
                                    className="capitalize rounded-md group-hover:bg-n-alpha-2"
                                    onClick={() => setShowDropdown(current => !current)}
                                />
                                {showDropdown && (
                                    <DropdownMenu
                                        menuItems={teamMenuList}
                                        className="mt-1 ltr:right-0 rtl:left-0 xl:ltr:right-0 xl:rtl:left-0 top-full"
                                        onAction={item => {
                                            setShowDropdown(false);
                                            setSelectedTeam(Number(item.value) || null);
                                        }}
                                    />
                                )}
                            </div>
                        ) : undefined
                    }
                >
                    {conversationMetrics.map(([name, metric]) => (
                        <div key={name} className="flex-1 min-w-0 pb-2">
                            <h3 className="text-base text-n-slate-11">{name}</h3>
                            <p className="text-n-slate-12 text-3xl mb-0 mt-1">{metric}</p>
                        </div>
                    ))}
                </MetricCard>
            </div>
            <div className="flex-1 w-full max-w-full md:w-[35%] md:max-w-[35%]">
                <MetricCard header={t('OVERVIEW_REPORTS.AGENT_STATUS.HEADER')}>
                    {agentStatusMetrics.map(([name, metric]) => (
                        <div key={name} className="flex-1 min-w-0 pb-2">
                            <h3 className="text-base text-n-slate-11">{name}</h3>
                            <p className="text-n-slate-12 text-3xl mb-0 mt-1">{metric}</p>
                        </div>
                    ))}
                </MetricCard>
            </div>
        </div>
    );
}
