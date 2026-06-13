import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

type Messages = Record<string, unknown>;

function lookup(messages: Messages, key: string): unknown {
    return key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in (acc as object)) {
            return (acc as Record<string, unknown>)[part];
        }
        return undefined;
    }, messages);
}

/**
 * Translator hook. Reads the shared i18n bundle (Laravel lang/) and resolves a
 * dot-path key, falling back to the key itself when missing. Supports `:param`
 * interpolation. No user-facing string should be hard-coded (design-system §10).
 *
 *   const t = useTranslator();
 *   t('platform.actions.save')           // "Lưu" / "Save"
 *   t('platform.roles.admin')
 */
export function useTranslator(): (key: string, params?: Record<string, string | number>) => string {
    const { i18n } = usePage<SharedData>().props;

    return (key, params = {}) => {
        const value = lookup(i18n as Messages, key);

        if (typeof value !== 'string') {
            return key;
        }

        return Object.entries(params).reduce((str, [name, val]) => str.replaceAll(`:${name}`, String(val)), value);
    };
}
