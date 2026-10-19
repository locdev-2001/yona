import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import LoadingState from 'dashboard/components/widgets/LoadingState';
import { useAlert } from 'dashboard/composables/useAlert';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import Dashboard from '../../Dashboard';
import type { DashboardPageProps } from '../../types';
import SettingsContent from '../SettingsContent';
import MacroForm from './MacroForm';
import { formatMacro, generateMacroPayload, newMacroAction } from './macroHelper';
import { createMacro, fetchMacro, updateMacro } from './macrosStore';
import { EMPTY_OPTION_SETS, loadMacroOptionSets } from './useMacroOptionSets';
import type { MacroDraft, MacroOptionSets } from './types';

// Port từ settings/macros/MacroEditor.vue

interface PageProps extends DashboardPageProps {
    macroId?: number;
}

export default function MacroEditor() {
    const { auth, currentAccount, currentAccountUser, macroId } = usePage<PageProps>().props;
    const accountId = currentAccount.id;
    const isAdmin = currentAccountUser.role === 'administrator';
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;

    const [macro, setMacro] = useState<MacroDraft | null>(null);
    const [optionSets, setOptionSets] = useState<MacroOptionSets>(EMPTY_OPTION_SETS);
    const [isFetching, setFetching] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const sets = await loadMacroOptionSets(accountId);
                if (!active) return;
                setOptionSets(sets);

                if (macroId) {
                    const saved = await fetchMacro(accountId, macroId);
                    if (!active) return;
                    setMacro(formatMacro({ name: saved.name, visibility: saved.visibility, actions: saved.actions, files: saved.files }, sets));
                } else {
                    setMacro({ name: '', actions: [newMacroAction()], visibility: isAdmin ? 'global' : 'personal' });
                }
            } catch (error) {
                if (active) useAlert(parseApiErrorMessage(error) || t('MACROS.ERROR'));
            } finally {
                if (active) setFetching(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [accountId, macroId, isAdmin]);

    // Macro công khai chỉ quản trị viên sửa được; agent vẫn xem được ở chế độ đọc.
    const isPublicMacroReadOnly = macro?.visibility === 'global' && !isAdmin;

    const saveMacro = async (macroData: MacroDraft) => {
        if (isPublicMacroReadOnly) return;
        const payload = generateMacroPayload(macroData);
        try {
            if (macroId) {
                await updateMacro(accountId, macroId, payload);
                useAlert(t('MACROS.EDIT.API.SUCCESS_MESSAGE'));
            } else {
                await createMacro(accountId, payload);
                useAlert(t('MACROS.ADD.API.SUCCESS_MESSAGE'));
            }
            router.visit(accountScopedUrl(accountId, 'settings/macros'));
        } catch {
            useAlert(t('MACROS.ERROR'));
        }
    };

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('MACROS.HEADER')} showBackButton>
                <div className="flex flex-col gap-6 mb-8 max-w-7xl mx-auto h-full w-full !px-6">
                    {isFetching ? <LoadingState message={t('MACROS.EDITOR.LOADING')} /> : null}
                    {macro && !isFetching ? (
                        <MacroForm
                            macro={macro}
                            optionSets={optionSets}
                            uiSettings={uiSettings}
                            canManagePublicMacros={isAdmin}
                            readOnly={isPublicMacroReadOnly}
                            onChange={setMacro}
                            onSubmit={macroData => void saveMacro(macroData)}
                        />
                    ) : null}
                </div>
            </SettingsContent>
        </Dashboard>
    );
}
