import { useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';

import Button from 'dashboard/components-next/button/Button';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import { useAlert } from 'dashboard/composables/useAlert';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import type { DashboardPageProps } from '../../types';
import BaseSettingsHeader from '../BaseSettingsHeader';
import SettingsLayout from '../SettingsLayout';
import SettingsWrapper from '../SettingsWrapper';
import MacrosTableRow from './MacrosTableRow';
import { deleteMacro, useMacros } from './macrosStore';
import type { Macro } from './types';

// Port từ settings/macros/Index.vue
export default function MacrosIndex() {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isAdmin = currentAccountUser.role === 'administrator';

    const { records, isFetching } = useMacros(accountId);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);

    const filteredRecords = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return records;
        return picoSearch(records, query, ['name']);
    }, [records, searchQuery]);

    const confirmDeletion = async () => {
        const macro = selectedMacro;
        setSelectedMacro(null);
        if (!macro) return;
        try {
            await deleteMacro(accountId, macro.id);
            useAlert(t('MACROS.DELETE.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('MACROS.DELETE.API.ERROR_MESSAGE'));
        }
    };

    const headers = [
        t('MACROS.LIST.TABLE_HEADER.NAME'),
        t('MACROS.LIST.TABLE_HEADER.CREATED BY'),
        t('MACROS.LIST.TABLE_HEADER.LAST_UPDATED_BY'),
        t('MACROS.LIST.TABLE_HEADER.VISIBILITY'),
        t('MACROS.LIST.TABLE_HEADER.ACTIONS'),
    ];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('MACROS.LOADING')}
                    noRecordsFound={!records.length}
                    noRecordsMessage={t('MACROS.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('MACROS.HEADER')}
                            description={t('MACROS.DESCRIPTION')}
                            linkText={t('MACROS.LEARN_MORE')}
                            featureName="macros"
                            searchPlaceholder={t('MACROS.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            count={
                                records.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('MACROS.COUNT', { n: records.length })}
                                    </span>
                                ) : null
                            }
                            actions={
                                <Link href={accountScopedUrl(accountId, 'settings/macros/new')}>
                                    <Button size="sm" label={t('MACROS.HEADER_BTN_TXT')} />
                                </Link>
                            }
                        />
                    }
                    body={
                        <BaseTable
                            headers={headers}
                            hasItems={filteredRecords.length > 0}
                            noDataMessage={searchQuery ? t('MACROS.NO_RESULTS') : t('MACROS.LIST.404')}
                        >
                            {filteredRecords.map(macro => (
                                <MacrosTableRow
                                    key={macro.id}
                                    macro={macro}
                                    accountId={accountId}
                                    canManagePublicMacros={isAdmin}
                                    onDelete={() => setSelectedMacro(macro)}
                                />
                            ))}
                        </BaseTable>
                    }
                />
            </SettingsWrapper>

            <DeleteModal
                show={selectedMacro !== null}
                onClose={() => setSelectedMacro(null)}
                onConfirm={() => void confirmDeletion()}
                title={t('LABEL_MGMT.DELETE.CONFIRM.TITLE')}
                message={t('MACROS.DELETE.CONFIRM.MESSAGE')}
                messageValue={` ${selectedMacro?.name ?? ''}?`}
                confirmText={t('MACROS.DELETE.CONFIRM.YES')}
                rejectText={t('MACROS.DELETE.CONFIRM.NO')}
            />
        </Dashboard>
    );
}
