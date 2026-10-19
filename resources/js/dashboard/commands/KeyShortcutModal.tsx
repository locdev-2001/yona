import { usePage } from '@inertiajs/react';

import Modal from 'dashboard/components/Modal';
import Kbd from 'dashboard/components-next/kbd/Kbd';
import { isEditorHotKeyEnabled } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from 'dashboard/types';
import { t } from '../../i18n';
import { shortcutGroups } from './shortcutKeys';

interface KeyShortcutModalProps {
    show: boolean;
    onClose: () => void;
}

// Bảng phím tắt chia nhóm, đọc từ shortcutKeys.ts; phím gửi tin theo cài đặt ô soạn.
export default function KeyShortcutModal({ show, onClose }: KeyShortcutModalProps) {
    const uiSettings = usePage<DashboardPageProps>().props.auth.user?.ui_settings ?? {};
    const groups = shortcutGroups(isEditorHotKeyEnabled(uiSettings, 'enter'));

    return (
        <Modal show={show} onClose={onClose} size="!w-[32rem] max-w-[calc(100vw-2rem)]">
            <div className="flex flex-col gap-5 p-6">
                <header className="pe-8">
                    <h2 className="m-0 text-base font-semibold text-n-slate-12">{t('KEYBOARD_SHORTCUTS.TITLE')}</h2>
                    <p className="m-0 mt-1 text-sm text-n-slate-11">{t('KEYBOARD_SHORTCUTS.SUBTITLE')}</p>
                </header>
                {groups.map(({ group, shortcuts }) => (
                    <section key={group} className="flex flex-col gap-1">
                        <h3 className="m-0 mb-1 text-xs font-medium uppercase tracking-wide text-n-slate-10">
                            {t(`KEYBOARD_SHORTCUTS.GROUPS.${group}`)}
                        </h3>
                        <ul className="m-0 p-0 list-none rounded-xl border border-n-weak divide-y divide-n-weak">
                            {shortcuts.map(shortcut => (
                                <li key={shortcut.action} className="flex items-center justify-between gap-4 px-3 py-2">
                                    <span className="text-sm text-n-slate-12">{t(`KEYBOARD_SHORTCUTS.ACTIONS.${shortcut.action}`)}</span>
                                    <span className="flex items-center gap-1 shrink-0">
                                        {shortcut.keys.map(key => (
                                            <Kbd key={key} keyName={key} />
                                        ))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </Modal>
    );
}
