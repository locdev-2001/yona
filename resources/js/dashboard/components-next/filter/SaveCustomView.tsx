import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import NextInput from 'dashboard/components-next/input/Input';
import { useAlert } from 'dashboard/composables/useAlert';
import { createCustomView } from 'dashboard/composables/useCustomViews';
import type { CustomView } from 'dashboard/composables/useCustomViews';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { t } from '../../../i18n';
import type { ConversationFilterPayload } from './helper/filterQuery';

// Port từ components-next/filter/SaveCustomView.vue.
interface SaveCustomViewProps {
    accountId: number;
    // 0 = folder (hội thoại), 1 = segment (liên hệ) — đúng enum của gốc.
    filterType: 0 | 1;
    customViewsQuery: ConversationFilterPayload[];
    onClose: () => void;
    onSaved: (view: CustomView) => void;
}

export default function SaveCustomView({
    accountId,
    filterType,
    customViewsQuery,
    onClose,
    onSaved,
}: SaveCustomViewProps) {
    const [name, setName] = useState('');
    const [touched, setTouched] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // v-on-click-outside với ignore #saveFilterTeleportTarget.
    useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (rootRef.current?.contains(target)) return;
            if (target.closest('#saveFilterTeleportTarget')) return;
            onClose();
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [onClose]);

    const saveCustomView = async (event: FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (!name.trim()) return;

        try {
            const created = await createCustomView(accountId, {
                name,
                filter_type: filterType,
                query: { payload: customViewsQuery },
            });
            useAlert(
                filterType === 0
                    ? t('FILTER.CUSTOM_VIEWS.ADD.API_FOLDERS.SUCCESS_MESSAGE')
                    : t('FILTER.CUSTOM_VIEWS.ADD.API_SEGMENTS.SUCCESS_MESSAGE'),
            );
            onClose();
            onSaved(created);
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) ||
                    (filterType === 0
                        ? t('FILTER.CUSTOM_VIEWS.ADD.API_FOLDERS.ERROR_MESSAGE')
                        : t('FILTER.CUSTOM_VIEWS.ADD.API_SEGMENTS.ERROR_MESSAGE')),
            );
        }
    };

    const hasError = touched && !name.trim();

    return (
        <div
            ref={rootRef}
            className="z-40 max-w-3xl lg:w-[500px] overflow-visible w-full border border-n-weak bg-n-alpha-3 backdrop-blur-[100px] shadow-lg rounded-xl p-6 grid gap-6"
        >
            <h3 className="text-base font-medium leading-6 text-n-slate-12">{t('FILTER.CUSTOM_VIEWS.ADD.TITLE')}</h3>
            <form className="w-full grid gap-6" onSubmit={saveCustomView}>
                <NextInput
                    value={name}
                    placeholder={t('FILTER.CUSTOM_VIEWS.ADD.PLACEHOLDER')}
                    message={hasError ? t('FILTER.CUSTOM_VIEWS.ADD.ERROR_MESSAGE') : ''}
                    messageType={hasError ? 'error' : 'info'}
                    onChange={event => setName(event.target.value)}
                    onBlur={() => setTouched(true)}
                />
                <div className="flex flex-row justify-end w-full gap-2">
                    <NextButton
                        faded
                        slate
                        sm
                        type="button"
                        onClick={event => {
                            event.preventDefault();
                            onClose();
                        }}
                    >
                        {t('FILTER.CUSTOM_VIEWS.ADD.CANCEL_BUTTON')}
                    </NextButton>
                    <NextButton solid blue sm type="submit" disabled={!name.trim()}>
                        {t('FILTER.CUSTOM_VIEWS.ADD.SAVE_BUTTON')}
                    </NextButton>
                </div>
            </form>
        </div>
    );
}
