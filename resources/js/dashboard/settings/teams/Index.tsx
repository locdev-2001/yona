import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import ConfirmDeleteModal from 'dashboard/components/widgets/modal/ConfirmDeleteModal';
import type { Team } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/teams/Index.vue.
// Danh sách lấy qua fetch thay cho vuex store teams.
export default function TeamsIndex() {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const isAdmin = currentAccountUser?.role === 'administrator';

    const [teams, setTeams] = useState<Team[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
    const [deletingIds, setDeletingIds] = useState<number[]>([]);

    useEffect(() => {
        let active = true;

        getJson<Team[]>(`/api/v1/accounts/${accountId}/teams`)
            .then(list => {
                if (active) setTeams(list);
            })
            .finally(() => {
                if (active) setFetching(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const filteredTeams = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return teams;

        return picoSearch(teams, query, ['name', 'description']);
    }, [teams, searchQuery]);

    const confirmDeletion = async () => {
        const team = deletingTeam;
        if (!team) return;

        setDeletingTeam(null);
        setDeletingIds(current => [...current, team.id]);

        try {
            await deleteJson(`/api/v1/accounts/${accountId}/teams/${team.id}`);
            setTeams(current => current.filter(item => item.id !== team.id));
            useAlert(t('TEAMS_SETTINGS.DELETE.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('TEAMS_SETTINGS.DELETE.API.ERROR_MESSAGE'));
        } finally {
            setDeletingIds(current => current.filter(id => id !== team.id));
        }
    };

    const teamRow = (team: Team) => (
        <div key={team.id} className="flex justify-between flex-row items-start gap-4 py-4">
            <div className="flex items-start gap-4">
                <div className="flex items-center flex-shrink-0 size-10 justify-center rounded-xl outline outline-1 outline-n-weak -outline-offset-1 text-lg">
                    {team.icon ? (
                        <EmojiIcon value={team.icon} color={team.icon_color} className="size-5" />
                    ) : (
                        <Icon icon="i-lucide-users-round" className="size-4 text-n-slate-11" />
                    )}
                </div>
                <div className="flex flex-col items-start gap-1">
                    <span className="block text-heading-3 text-n-slate-12 capitalize">{team.name}</span>
                    <p className="mb-0 text-n-slate-11 text-body-main">{team.description}</p>
                </div>
            </div>
            <div className="flex justify-end gap-3">
                {isAdmin ? (
                    <a href={accountScopedUrl(accountId, `settings/teams/${team.id}/edit`)}>
                        <Button title={t('TEAMS_SETTINGS.LIST.EDIT_TEAM')} icon={ICONS.settings} slate sm />
                    </a>
                ) : null}
                {isAdmin ? (
                    <Button
                        title={t('TEAMS_SETTINGS.DELETE.BUTTON_TEXT')}
                        icon={ICONS.delete}
                        slate
                        sm
                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                        isLoading={deletingIds.includes(team.id)}
                        onClick={() => setDeletingTeam(team)}
                    />
                ) : null}
            </div>
        </div>
    );

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('TEAMS_SETTINGS.LOADING')}
                    noRecordsFound={!teams.length}
                    noRecordsMessage={t('TEAMS_SETTINGS.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('TEAMS_SETTINGS.HEADER')}
                            description={t('TEAMS_SETTINGS.DESCRIPTION')}
                            linkText={t('TEAMS_SETTINGS.LEARN_MORE')}
                            featureName="team_management"
                            searchPlaceholder={t('TEAMS_SETTINGS.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            count={
                                teams.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('TEAMS_SETTINGS.COUNT', { n: teams.length })}
                                    </span>
                                ) : null
                            }
                            actions={
                                isAdmin ? (
                                    <a href={accountScopedUrl(accountId, 'settings/teams/new')}>
                                        <Button label={t('TEAMS_SETTINGS.NEW_TEAM')} size="sm" />
                                    </a>
                                ) : null
                            }
                        />
                    }
                    body={
                        !filteredTeams.length && searchQuery ? (
                            <span className="flex-1 flex items-center justify-center py-20 text-center text-body-main !text-base text-n-slate-11">
                                {t('TEAMS_SETTINGS.NO_RESULTS')}
                            </span>
                        ) : (
                            <div className="divide-y divide-n-weak border-t border-n-weak">
                                {filteredTeams.map(teamRow)}
                            </div>
                        )
                    }
                >
                    <ConfirmDeleteModal
                        show={deletingTeam !== null}
                        title={t('TEAMS_SETTINGS.DELETE.CONFIRM.TITLE', { teamName: deletingTeam?.name ?? '' })}
                        message={t('TEAMS_SETTINGS.DELETE.CONFIRM.MESSAGE')}
                        confirmText={`${t('TEAMS_SETTINGS.DELETE.CONFIRM.YES')} ${deletingTeam?.name ?? ''}`}
                        rejectText={t('TEAMS_SETTINGS.DELETE.CONFIRM.NO')}
                        confirmValue={deletingTeam?.name ?? ''}
                        confirmPlaceHolderText={t('TEAMS_SETTINGS.DELETE.CONFIRM.PLACE_HOLDER', {
                            teamName: deletingTeam?.name ?? '',
                        })}
                        onClose={() => setDeletingTeam(null)}
                        onConfirm={() => void confirmDeletion()}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
