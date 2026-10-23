import { createContext, useContext } from 'react';
import defaultCopy from '../../../../lang/vi/admin_design_preview.json';

const DesignCopyContext = createContext<Partial<typeof defaultCopy>>({});
export const DesignCopyProvider = DesignCopyContext.Provider;
export function useDesignCopy() {
    const copy = { ...defaultCopy, ...useContext(DesignCopyContext) };
    return {
        copy,
        text: (key: keyof typeof copy, ...values: (string | number)[]) =>
            copy[key].replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? '')),
    };
}
