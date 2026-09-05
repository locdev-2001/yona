import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';
import { LAYOUT_QWERTZ, detectKeyboardLayout, keysToModifyInQWERTZ } from 'dashboard/composables/useKeyboardEvents';
import { t } from '../../i18n';
import { KEYS, SHORTCUT_KEYS } from './shortcutKeys';

// Port từ dashboard/components/widgets/modal/WootKeyShortcutModal.vue.
// `Hotkey.vue` (kbd.hotkey) chỉ có style nên gộp thẳng vào đây.

// `kbd.hotkey` gốc có `leading-[0.625rem]` nhưng class `.key` (scoped, đặc hiệu hơn)
// đè bằng line-height của `text-xs` (16px) → bỏ leading ở đây để cao độ trùng oracle.
const HOTKEY_BASE =
    'hotkey p-0.5 min-w-[1rem] uppercase inline-flex rounded tracking-wide flex-shrink-0 items-center select-none justify-center';
// class `.key` trong <style scoped> của modal gốc.
const KEY_STYLE =
    'py-2 px-2.5 font-semibold text-xs text-n-slate-12 bg-n-slate-4 dark:bg-n-slate-2 shadow border-b-2 rtl:border-l-2 ltr:border-r-2 border-n-strong';

function Hotkey({ className = '', children }: { className?: string; children: ReactNode }) {
    return <kbd className={`${HOTKEY_BASE} ${className}`}>{children}</kbd>;
}

interface KeyShortcutModalProps {
    show: boolean;
    onClose: () => void;
}

export default function KeyShortcutModal({ show, onClose }: KeyShortcutModalProps) {
    const [currentLayout, setCurrentLayout] = useState<string | null>(null);

    useEffect(() => {
        if (!show) return;
        void detectKeyboardLayout().then(setCurrentLayout);
    }, [show]);

    // Bàn phím QWERTZ cần thêm Shift (chatwoot#9492).
    const needsShiftKey = (keySet: string[]) =>
        currentLayout === LAYOUT_QWERTZ && keySet.some(key => keysToModifyInQWERTZ.has(key));

    return (
        <Modal show={show} onClose={onClose} size="medium">
            <div className="flex flex-col h-auto overflow-auto">
                <ModalHeader headerTitle={t('SIDEBAR_ITEMS.KEYBOARD_SHORTCUTS')} />
                <div className="grid grid-cols-2 px-8 pt-0 pb-4 mt-6 gap-x-5 gap-y-3">
                    <div className="flex justify-between items-center min-w-[25rem]">
                        <h5 className="text-sm text-n-slate-12">{t('KEYBOARD_SHORTCUTS.TOGGLE_MODAL')}</h5>
                        <div className="flex items-center gap-2 mb-1 ml-2">
                            <Hotkey className={`min-h-[28px] min-w-[60px] normal-case ${KEY_STYLE}`}>{KEYS.WIN}</Hotkey>
                            <Hotkey className={`min-h-[28px] min-w-[36px] ${KEY_STYLE}`}>{KEYS.SLASH}</Hotkey>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 px-8 pt-0 pb-8 gap-x-5 gap-y-3">
                    {SHORTCUT_KEYS.map(shortcut => (
                        <div key={shortcut.id} className="flex justify-between items-center min-w-[25rem]">
                            <h5 className="text-sm text-n-slate-12 min-w-[36px]">
                                {t(`KEYBOARD_SHORTCUTS.TITLE.${shortcut.label}`)}
                            </h5>
                            <div className="flex items-center gap-2 mb-1 ml-2">
                                {needsShiftKey(shortcut.keySet) ? (
                                    <Hotkey className={`min-h-[28px] min-w-[36px] ${KEY_STYLE}`}>{KEYS.SHIFT}</Hotkey>
                                ) : null}
                                {shortcut.displayKeys.map((key, index) =>
                                    key !== KEYS.SLASH ? (
                                        <Hotkey
                                            key={index}
                                            className={`min-h-[28px] min-w-[36px] normal-case ${KEY_STYLE}`}
                                        >
                                            {key}
                                        </Hotkey>
                                    ) : (
                                        <span
                                            key={index}
                                            className="flex items-center text-sm font-semibold text-n-slate-12"
                                        >
                                            {key}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
